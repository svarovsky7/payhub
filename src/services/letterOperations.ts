import { supabase } from '../lib/supabase'
import type { Letter, LetterStatus } from '../lib/supabase'
import dayjs from 'dayjs'
import { createAuditLogEntry } from './auditLogService'

/**
 * Load all letter statuses
 */
export async function loadLetterStatuses(): Promise<LetterStatus[]> {
  console.log('[letterOperations.loadLetterStatuses] Loading letter statuses')

  const { data, error } = await supabase
    .from('letter_statuses')
    .select('*')
    .order('id')

  if (error) {
    console.error('[letterOperations.loadLetterStatuses] Error:', error)
    throw error
  }

  return data || []
}

/**
 * Generate registration number for a letter
 * Format: <КОД_ОБЪЕКТА>-<ТИП>-<YYMM>-<ПОРЯДКОВЫЙ>
 * Example: ПРИМ14-ВХ-2510-0001
 */
export async function generateRegNumber(
  projectId: number,
  direction: 'incoming' | 'outgoing'
): Promise<string> {
  console.log('[letterOperations.generateRegNumber] Generating reg number for:', { projectId, direction })

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

  console.log('[letterOperations.generateRegNumber] Query parameters:', {
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

  console.log('[letterOperations.generateRegNumber] All letters with reg_number for this project:', allProjectLetters)

  // Find all letters with matching pattern for this project (both incoming and outgoing)
  const { data: existingLetters, error: lettersError } = await supabase
    .from('letters')
    .select('reg_number')
    .eq('project_id', projectId)
    .not('reg_number', 'is', null)
    .like('reg_number', searchPattern)

  console.log('[letterOperations.generateRegNumber] Query result:', {
    found: existingLetters?.length || 0,
    data: existingLetters,
    error: lettersError
  })

  if (lettersError) {
    console.error('[letterOperations.generateRegNumber] Error fetching existing letters:', lettersError)
    throw lettersError
  }

  console.log('[letterOperations.generateRegNumber] Search pattern:', searchPattern)
  console.log('[letterOperations.generateRegNumber] Found letters matching pattern:', existingLetters?.length || 0)

  let nextNumber = 1

  // Parse all existing numbers and find maximum
  if (existingLetters && existingLetters.length > 0) {
    console.log('[letterOperations.generateRegNumber] Existing registration numbers:', existingLetters.map(l => l.reg_number))

    const seqNumbers: number[] = []

    for (const letter of existingLetters) {
      if (letter.reg_number) {
        const parts = letter.reg_number.split('-')
        if (parts.length === 4) {
          const seqNumber = parseInt(parts[3], 10)
          if (!isNaN(seqNumber)) {
            seqNumbers.push(seqNumber)
            console.log(`[letterOperations.generateRegNumber] Parsed number from ${letter.reg_number}: ${seqNumber}`)
          }
        }
      }
    }

    console.log('[letterOperations.generateRegNumber] All parsed sequence numbers:', seqNumbers)

    if (seqNumbers.length > 0) {
      const maxNumber = Math.max(...seqNumbers)
      nextNumber = maxNumber + 1
      console.log('[letterOperations.generateRegNumber] Maximum number found:', maxNumber)
      console.log('[letterOperations.generateRegNumber] Next number (max + 1):', nextNumber)
    } else {
      console.log('[letterOperations.generateRegNumber] No valid sequence numbers found, using default:', nextNumber)
    }
  } else {
    console.log('[letterOperations.generateRegNumber] No existing letters found, starting from:', nextNumber)
  }

  // Format sequential number as 4 digits
  const seqNumberFormatted = nextNumber.toString().padStart(4, '0')

  // Build final registration number with correct direction prefix
  const regNumber = `${projectCode}-${typePrefix}-${yymm}-${seqNumberFormatted}`

  console.log('[letterOperations.generateRegNumber] Generated:', regNumber)
  return regNumber
}

/**
 * Load all letters with related data and their children
 * Filters by user projects if role has own_projects_only flag set
 */
export async function loadLetters(userId?: string): Promise<Letter[]> {
  console.log('[letterOperations.loadLetters] Loading letters', { userId })

  // Build base query
  let query = supabase
    .from('letters')
    .select(`
      *,
      project:projects(id, name, code),
      status:letter_statuses(id, name, code, color),
      responsible_user:user_profiles!letters_responsible_user_id_fkey(id, full_name, email),
      creator:user_profiles!letters_created_by_fkey(id, full_name, email),
      sender_contractor:contractors!fk_letters_sender_contractor(id, name),
      recipient_contractor:contractors!fk_letters_recipient_contractor(id, name)
    `)

  // If userId is provided, check role and filter by user projects if necessary
  if (userId) {
    // Load user profile and role
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role_id')
      .eq('id', userId)
      .single()

    if (profileError) {
      console.error('[letterOperations.loadLetters] Error loading user profile:', profileError)
      throw profileError
    }

    if (userProfile?.role_id) {
      // Load role data
      const { data: roleData, error: roleError } = await supabase
        .from('roles')
        .select('id, own_projects_only')
        .eq('id', userProfile.role_id)
        .single()

      if (roleError) {
        console.error('[letterOperations.loadLetters] Error loading role:', roleError)
        throw roleError
      }

      // If role restricts to own projects only, filter by user's projects
      if (roleData?.own_projects_only) {
        console.log('[letterOperations.loadLetters] Filtering by user projects for role with own_projects_only')

        const { data: userProjects, error: projectsError } = await supabase
          .from('user_projects')
          .select('project_id')
          .eq('user_id', userId)

        if (projectsError) {
          console.error('[letterOperations.loadLetters] Error loading user projects:', projectsError)
          throw projectsError
        }

        const projectIds = userProjects?.map(p => p.project_id) || []

        if (projectIds.length > 0) {
          query = query.in('project_id', projectIds)
        } else {
          // User has no projects, return empty array
          console.log('[letterOperations.loadLetters] User has no assigned projects')
          return []
        }
      }
    }
  }

  // Execute query
  const { data, error } = await query.order('created_at', { ascending: false })

  if (error) {
    console.error('[letterOperations.loadLetters] Error:', error)
    throw error
  }

  if (!data) return []

  // Get child letter IDs only for letters in the current dataset
  // This ensures we only filter out children that belong to currently loaded parents
  const parentLetterIds = data.map(l => l.id)

  // Use batching to avoid URL length issues (max 50 UUIDs per request)
  const BATCH_SIZE = 50

  // Load child IDs in batches
  const idBatches: string[][] = []
  for (let i = 0; i < parentLetterIds.length; i += BATCH_SIZE) {
    idBatches.push(parentLetterIds.slice(i, i + BATCH_SIZE))
  }

  const childIdResults = await Promise.all(
    idBatches.map(async (batch) => {
      const { data } = await supabase
        .from('letter_links')
        .select('child_id')
        .in('parent_id', batch)
      return data || []
    })
  )

  const childLinks = childIdResults.flat()
  const childLetterIds = new Set(childLinks?.map(link => link.child_id) || [])

  // Filter out child letters from main list
  const parentLetters = data.filter(letter => !childLetterIds.has(letter.id))

  // Load ALL children for all parent letters (with batching to avoid URL length limit)
  if (parentLetterIds.length === 0) {
    return []
  }

  // Split into batches for loading full child data
  const batches: string[][] = []
  for (let i = 0; i < parentLetterIds.length; i += BATCH_SIZE) {
    batches.push(parentLetterIds.slice(i, i + BATCH_SIZE))
  }

  console.log(`[letterOperations.loadLetters] Loading children in ${batches.length} batches`)

  // Load children for each batch in parallel
  const batchResults = await Promise.all(
    batches.map(async (batch) => {
      const { data, error } = await supabase
        .from('letter_links')
        .select(`
          parent_id,
          child_letter:letters!letter_links_child_id_fkey(
            *,
            project:projects(id, name, code),
            status:letter_statuses(id, name, code, color),
            responsible_user:user_profiles!letters_responsible_user_id_fkey(id, full_name, email),
            creator:user_profiles!letters_created_by_fkey(id, full_name, email),
            sender_contractor:contractors!fk_letters_sender_contractor(id, name),
            recipient_contractor:contractors!fk_letters_recipient_contractor(id, name)
          )
        `)
        .in('parent_id', batch)

      if (error) {
        console.error('[letterOperations.loadLetters] Error loading batch:', error)
        throw error
      }

      return data || []
    })
  )

  // Flatten all batch results
  const allChildLinks = batchResults.flat()

  // Group children by parent_id
  const childrenByParent = new Map<string, Letter[]>()
  allChildLinks?.forEach((link: any) => {
    const parentId = link.parent_id
    const child = link.child_letter
    if (child) {
      const childWithParent = { ...child, parent_id: parentId }
      if (!childrenByParent.has(parentId)) {
        childrenByParent.set(parentId, [])
      }
      childrenByParent.get(parentId)!.push(childWithParent)
    }
  })

  // Attach children to parent letters
  const lettersWithChildren = parentLetters.map((letter) => {
    const children = childrenByParent.get(letter.id) || []
    return {
      ...letter,
      children: children.length > 0 ? children : undefined
    }
  })

  return lettersWithChildren
}

/**
 * Get a single letter by ID with all related data
 */
export async function getLetterById(letterId: string): Promise<Letter | null> {
  console.log('[letterOperations.getLetterById] Loading letter:', letterId)

  const { data, error } = await supabase
    .from('letters')
    .select(`
      *,
      project:projects(id, name, code),
      status:letter_statuses(id, name, code, color),
      responsible_user:user_profiles!letters_responsible_user_id_fkey(id, full_name, email),
      creator:user_profiles!letters_created_by_fkey(id, full_name, email)
    `)
    .eq('id', letterId)
    .single()

  if (error) {
    console.error('[letterOperations.getLetterById] Error:', error)
    throw error
  }

  return data
}

/**
 * Create a new letter
 */
export async function createLetter(
  letterData: Partial<Letter>,
  files?: File[]
): Promise<Letter> {
  console.log('[letterOperations.createLetter] Creating letter:', letterData)

  const { data, error } = await supabase
    .from('letters')
    .insert(letterData)
    .select(`
      *,
      project:projects(id, name, code),
      status:letter_statuses(id, name, code, color),
      responsible_user:user_profiles!letters_responsible_user_id_fkey(id, full_name, email),
      creator:user_profiles!letters_created_by_fkey(id, full_name, email),
      sender_contractor:contractors!fk_letters_sender_contractor(id, name),
      recipient_contractor:contractors!fk_letters_recipient_contractor(id, name)
    `)
    .single()

  if (error) {
    console.error('[letterOperations.createLetter] Error:', error)
    throw error
  }

  // Upload files if provided
  if (files && files.length > 0 && data) {
    await processLetterFiles(data.id, files)
  }

  // Log creation
  const { data: { session } } = await supabase.auth.getSession()
  if (session?.user?.id) {
    await createAuditLogEntry('letter', data.id, 'create', session.user.id, {
      metadata: {
        letter_number: data.number,
        subject: data.subject,
        direction: data.direction
      }
    })
  }

  return data
}

/**
 * Update an existing letter
 */
export async function updateLetter(
  letterId: string,
  letterData: Partial<Letter>,
  files?: File[],
  originalFiles?: any[]
): Promise<Letter> {
  console.log('[letterOperations.updateLetter] Updating letter:', letterId, letterData)

  // Get old letter data before updating
  const { data: oldLetter } = await supabase
    .from('letters')
    .select('*')
    .eq('id', letterId)
    .single()

  const { data, error } = await supabase
    .from('letters')
    .update(letterData)
    .eq('id', letterId)
    .select(`
      *,
      project:projects(id, name, code),
      status:letter_statuses(id, name, code, color),
      responsible_user:user_profiles!letters_responsible_user_id_fkey(id, full_name, email),
      creator:user_profiles!letters_created_by_fkey(id, full_name, email),
      sender_contractor:contractors!fk_letters_sender_contractor(id, name),
      recipient_contractor:contractors!fk_letters_recipient_contractor(id, name)
    `)
    .single()

  if (error) {
    console.error('[letterOperations.updateLetter] Error:', error)
    throw error
  }

  // Handle file operations
  if (files || originalFiles) {
    await processLetterFiles(letterId, files || [], originalFiles || [])
  }

  // Log updates for changed fields
  const { data: { session } } = await supabase.auth.getSession()
  if (session?.user?.id && oldLetter) {
    const fieldsToLog = [
      'number', 'reg_number', 'letter_date', 'reg_date', 'subject', 'content',
      'sender', 'recipient', 'direction', 'delivery_method', 'status_id',
      'project_id', 'responsible_user_id', 'responsible_person_name'
    ] as const

    for (const field of fieldsToLog) {
      const oldValue = oldLetter[field]
      const newValue = (letterData as any)[field]

      // Only log if field was actually changed
      if (newValue !== undefined && oldValue !== newValue) {
        await createAuditLogEntry('letter', letterId, 'update', session.user.id, {
          fieldName: field,
          oldValue: oldValue != null ? String(oldValue) : undefined,
          newValue: newValue != null ? String(newValue) : undefined
        })
      }
    }
  }

  return data
}

/**
 * Delete a letter
 */
export async function deleteLetter(letterId: string): Promise<void> {
  console.log('[letterOperations.deleteLetter] Deleting letter:', letterId)

  // Delete associated files first
  const { data: attachments } = await supabase
    .from('letter_attachments')
    .select('attachment_id')
    .eq('letter_id', letterId)

  if (attachments && attachments.length > 0) {
    for (const att of attachments) {
      // Get file path
      const { data: fileData } = await supabase
        .from('attachments')
        .select('storage_path')
        .eq('id', att.attachment_id)
        .single()

      if (fileData) {
        // Delete from storage
        await supabase.storage
          .from('attachments')
          .remove([fileData.storage_path])
      }

      // Delete attachment record
      await supabase
        .from('attachments')
        .delete()
        .eq('id', att.attachment_id)
    }
  }

  // Delete the letter (cascade will handle letter_attachments and letter_links)
  const { error } = await supabase
    .from('letters')
    .delete()
    .eq('id', letterId)

  if (error) {
    console.error('[letterOperations.deleteLetter] Error:', error)
    throw error
  }
}

/**
 * Process letter files (upload new, delete removed)
 */
async function processLetterFiles(
  letterId: string,
  newFiles: File[] = [],
  originalFiles: any[] = []
): Promise<void> {
  console.log('[letterOperations.processLetterFiles] Processing files for letter:', letterId)

  // Import file attachment service
  const { uploadAndLinkFile, deleteFile } = await import('./fileAttachmentService')

  // Get current attachments
  const { data: currentAttachments } = await supabase
    .from('letter_attachments')
    .select('attachment_id, attachments(id, original_name, storage_path)')
    .eq('letter_id', letterId)

  // Determine which files to delete
  const currentFileNames = currentAttachments?.map(a => (a as any).attachments?.original_name) || []
  const originalFileNames = originalFiles || []
  const filesToDelete = currentFileNames.filter((name: string) => !originalFileNames.includes(name))

  // Delete removed files
  for (const fileName of filesToDelete) {
    const attachment = currentAttachments?.find(a => (a as any).attachments?.original_name === fileName)
    if (attachment && (attachment as any).attachments) {
      await deleteFile((attachment as any).attachments.id, (attachment as any).attachments.storage_path)
    }
  }

  // Upload new files
  // Get current user from session
  const { data: { session } } = await supabase.auth.getSession()
  const userId = session?.user?.id

  if (!userId) {
    throw new Error('User not authenticated')
  }

  for (const file of newFiles) {
    await uploadAndLinkFile({
      file,
      entityType: 'letter',
      entityId: letterId,
      userId
    })
  }
}

/**
 * Get parent letters for a letter
 */
export async function getParentLetters(letterId: string): Promise<Letter[]> {
  console.log('[letterOperations.getParentLetters] Loading parent letters for:', letterId)

  const { data, error } = await supabase
    .from('letter_links')
    .select(`
      parent_letter:letters!letter_links_parent_id_fkey(
        id,
        number,
        letter_date,
        subject,
        direction
      )
    `)
    .eq('child_id', letterId)

  if (error) {
    console.error('[letterOperations.getParentLetters] Error:', error)
    throw error
  }

  return data?.map(d => (d as any).parent_letter).filter(Boolean) || []
}

/**
 * Get child letters for a letter
 */
export async function getChildLetters(letterId: string): Promise<Letter[]> {
  console.log('[letterOperations.getChildLetters] Loading child letters for:', letterId)

  const { data, error } = await supabase
    .from('letter_links')
    .select(`
      child_letter:letters!letter_links_child_id_fkey(
        id,
        number,
        letter_date,
        subject,
        direction
      )
    `)
    .eq('parent_id', letterId)

  if (error) {
    console.error('[letterOperations.getChildLetters] Error:', error)
    throw error
  }

  return data?.map(d => (d as any).child_letter).filter(Boolean) || []
}

/**
 * Link a child letter to a parent letter
 */
export async function linkLetters(parentId: string, childId: string): Promise<void> {
  console.log('[letterOperations.linkLetters] Linking letters:', { parentId, childId })

  const { error } = await supabase
    .from('letter_links')
    .insert({
      parent_id: parentId,
      child_id: childId
    })

  if (error) {
    console.error('[letterOperations.linkLetters] Error:', error)
    throw error
  }
}

/**
 * Unlink a child letter from a parent letter
 */
export async function unlinkLetters(parentId: string, childId: string): Promise<void> {
  console.log('[letterOperations.unlinkLetters] Unlinking letters:', { parentId, childId })

  const { error } = await supabase
    .from('letter_links')
    .delete()
    .eq('parent_id', parentId)
    .eq('child_id', childId)

  if (error) {
    console.error('[letterOperations.unlinkLetters] Error:', error)
    throw error
  }
}

/**
 * Get letter attachments
 */
export async function getLetterAttachments(letterId: string): Promise<any[]> {
  console.log('[letterOperations.getLetterAttachments] Loading attachments for letter:', letterId)

  const { data, error } = await supabase
    .from('letter_attachments')
    .select(`
      id,
      attachment_id,
      attachments(
        id,
        original_name,
        storage_path,
        size_bytes,
        mime_type,
        created_at
      )
    `)
    .eq('letter_id', letterId)

  if (error) {
    console.error('[letterOperations.getLetterAttachments] Error:', error)
    throw error
  }

  return data || []
}
