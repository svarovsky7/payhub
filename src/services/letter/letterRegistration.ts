import { supabase } from '../../lib/supabase'
import dayjs from 'dayjs'

/**
 * Generate registration number for a letter
 * Format: <КОД_ОБЪЕКТА>-<ТИП>-<YYMM>-<ПОРЯДКОВЫЙ>
 * Example: ПРИМ14-ВХ-2510-0001
 */
export async function generateRegNumber(
  projectId: number,
  direction: 'incoming' | 'outgoing'
): Promise<string> {
  console.log('[letterRegistration.generateRegNumber] Generating reg number for:', { projectId, direction })

  // Get project code
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('code')
    .eq('id', projectId)
    .single()

  if (projectError || !project?.code) {
    throw new Error('Проект не найден или не имеет кода')
  }

  const projectCode = project.code

  // Determine type prefix
  const typePrefix = direction === 'incoming' ? 'ВХ' : 'ИСХ'

  // Generate YYMM (last 2 digits of year + 2 digits of month)
  const now = dayjs()
  const yymm = now.format('YYMM')

  // Build search pattern for all letters in this project for current month (any direction)
  const searchPattern = `${projectCode}-%-${yymm}-%`

  console.log('[letterRegistration.generateRegNumber] Query parameters:', {
    projectId,
    projectCode,
    typePrefix,
    yymm,
    searchPattern
  })

  // First, check all letters with reg_number for this project (for debugging)
  const { data: allProjectLetters } = await supabase
    .from('letters')
    .select('reg_number')
    .eq('project_id', projectId)
    .not('reg_number', 'is', null)

  console.log('[letterRegistration.generateRegNumber] All letters with reg_number for this project:', allProjectLetters)

  // Find all letters with matching pattern for this project (both incoming and outgoing)
  const { data: existingLetters, error: lettersError } = await supabase
    .from('letters')
    .select('reg_number')
    .eq('project_id', projectId)
    .not('reg_number', 'is', null)
    .like('reg_number', searchPattern)

  console.log('[letterRegistration.generateRegNumber] Query result:', {
    found: existingLetters?.length || 0,
    data: existingLetters,
    error: lettersError
  })

  if (lettersError) {
    console.error('[letterRegistration.generateRegNumber] Error fetching existing letters:', lettersError)
    throw lettersError
  }

  console.log('[letterRegistration.generateRegNumber] Search pattern:', searchPattern)
  console.log('[letterRegistration.generateRegNumber] Found letters matching pattern:', existingLetters?.length || 0)

  let nextNumber = 1

  // Parse all existing numbers and find maximum
  if (existingLetters && existingLetters.length > 0) {
    console.log('[letterRegistration.generateRegNumber] Existing registration numbers:', existingLetters.map(l => l.reg_number))

    const seqNumbers: number[] = []

    for (const letter of existingLetters) {
      if (letter.reg_number) {
        const parts = letter.reg_number.split('-')
        if (parts.length === 4) {
          const seqNumber = parseInt(parts[3], 10)
          if (!isNaN(seqNumber)) {
            seqNumbers.push(seqNumber)
            console.log(`[letterRegistration.generateRegNumber] Parsed number from ${letter.reg_number}: ${seqNumber}`)
          }
        }
      }
    }

    console.log('[letterRegistration.generateRegNumber] All parsed sequence numbers:', seqNumbers)

    if (seqNumbers.length > 0) {
      const maxNumber = Math.max(...seqNumbers)
      nextNumber = maxNumber + 1
      console.log('[letterRegistration.generateRegNumber] Maximum number found:', maxNumber)
      console.log('[letterRegistration.generateRegNumber] Next number (max + 1):', nextNumber)
    } else {
      console.log('[letterRegistration.generateRegNumber] No valid sequence numbers found, using default:', nextNumber)
    }
  } else {
    console.log('[letterRegistration.generateRegNumber] No existing letters found, starting from:', nextNumber)
  }

  // Format sequential number as 4 digits
  const seqNumberFormatted = nextNumber.toString().padStart(4, '0')

  // Build final registration number with correct direction prefix
  const regNumber = `${projectCode}-${typePrefix}-${yymm}-${seqNumberFormatted}`

  console.log('[letterRegistration.generateRegNumber] Generated:', regNumber)
  return regNumber
}
