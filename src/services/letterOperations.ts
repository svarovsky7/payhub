import { supabase } from '../lib/supabase'
import type { Letter, LetterStatus } from '../lib/supabase'

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
 * Load all letters with related data
 */
export async function loadLetters(): Promise<Letter[]> {
  console.log('[letterOperations.loadLetters] Loading letters')

  const { data, error } = await supabase
    .from('letters')
    .select(`
      *,
      project:projects(id, name, code),
      status:letter_statuses(id, name, code, color),
      responsible_user:user_profiles!letters_responsible_user_id_fkey(id, full_name, email),
      creator:user_profiles!letters_created_by_fkey(id, full_name, email)
    `)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[letterOperations.loadLetters] Error:', error)
    throw error
  }

  return data || []
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
    .select()
    .single()

  if (error) {
    console.error('[letterOperations.createLetter] Error:', error)
    throw error
  }

  // Upload files if provided
  if (files && files.length > 0 && data) {
    await processLetterFiles(data.id, files)
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

  const { data, error } = await supabase
    .from('letters')
    .update(letterData)
    .eq('id', letterId)
    .select()
    .single()

  if (error) {
    console.error('[letterOperations.updateLetter] Error:', error)
    throw error
  }

  // Handle file operations
  if (files || originalFiles) {
    await processLetterFiles(letterId, files || [], originalFiles || [])
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
