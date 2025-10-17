import { supabase } from '../../lib/supabase'
import type { Letter } from '../../lib/supabase'

/**
 * Get parent letters for a letter
 */
export async function getParentLetters(letterId: string): Promise<Letter[]> {
  console.log('[letterLinks.getParentLetters] Loading parent letters for:', letterId)

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
    console.error('[letterLinks.getParentLetters] Error:', error)
    throw error
  }

  return data?.map(d => (d as any).parent_letter).filter(Boolean) || []
}

/**
 * Get child letters for a letter
 */
export async function getChildLetters(letterId: string): Promise<Letter[]> {
  console.log('[letterLinks.getChildLetters] Loading child letters for:', letterId)

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
    console.error('[letterLinks.getChildLetters] Error:', error)
    throw error
  }

  return data?.map(d => (d as any).child_letter).filter(Boolean) || []
}

/**
 * Link a child letter to a parent letter
 */
export async function linkLetters(parentId: string, childId: string): Promise<void> {
  console.log('[letterLinks.linkLetters] Linking letters:', { parentId, childId })

  const { error } = await supabase
    .from('letter_links')
    .insert({
      parent_id: parentId,
      child_id: childId
    })

  if (error) {
    console.error('[letterLinks.linkLetters] Error:', error)
    throw error
  }
}

/**
 * Unlink a child letter from a parent letter
 */
export async function unlinkLetters(parentId: string, childId: string): Promise<void> {
  console.log('[letterLinks.unlinkLetters] Unlinking letters:', { parentId, childId })

  const { error } = await supabase
    .from('letter_links')
    .delete()
    .eq('parent_id', parentId)
    .eq('child_id', childId)

  if (error) {
    console.error('[letterLinks.unlinkLetters] Error:', error)
    throw error
  }
}
