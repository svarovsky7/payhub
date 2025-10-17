import { supabase } from '../../lib/supabase'

/**
 * Process letter files (upload new, delete removed)
 */
export async function processLetterFiles(
  letterId: string,
  newFiles: File[] = [],
  originalFiles: any[] = [],
  fileDescriptions?: Record<string, string>
): Promise<void> {
  console.log('[letterFiles.processLetterFiles] Processing files for letter:', letterId)

  // Import file attachment service
  const { uploadAndLinkFile, deleteFile } = await import('../fileAttachmentService')

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
    const description = fileDescriptions?.[file.name] || undefined
    await uploadAndLinkFile({
      file,
      entityType: 'letter',
      entityId: letterId,
      description,
      userId
    })
  }
}

/**
 * Get letter attachments
 */
export async function getLetterAttachments(letterId: string): Promise<any[]> {
  console.log('[letterFiles.getLetterAttachments] Loading attachments for letter:', letterId)

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
        description,
        created_at
      )
    `)
    .eq('letter_id', letterId)

  if (error) {
    console.error('[letterFiles.getLetterAttachments] Error:', error)
    throw error
  }

  console.log('[letterFiles.getLetterAttachments] Loaded attachments:', {
    count: data?.length || 0,
    attachments: data?.map(item => ({
      id: (item as any).attachments?.id,
      name: (item as any).attachments?.original_name,
      description: (item as any).attachments?.description
    }))
  })

  return data || []
}
