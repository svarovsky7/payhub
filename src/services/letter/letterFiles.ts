import { supabase } from '../../lib/supabase'
import { uploadAndLinkFile, deleteFile } from '../fileAttachmentService'
import { createAuditLogEntry } from '../auditLogService'

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

  // Get current attachments
  const { data: currentAttachments } = await supabase
    .from('letter_attachments')
    .select('attachment_id, attachments(id, original_name, storage_path)')
    .eq('letter_id', letterId)

  // Determine which files to delete
  const currentFileNames = currentAttachments?.map(a => (a as any).attachments?.original_name) || []
  const originalFileNames = originalFiles || []
  const filesToDelete = currentFileNames.filter((name: string) => !originalFileNames.includes(name))

  // Get current user from session
  const { data: { session } } = await supabase.auth.getSession()
  const userId = session?.user?.id

  if (!userId) {
    throw new Error('User not authenticated')
  }

  // Delete removed files
  for (const fileName of filesToDelete) {
    const attachment = currentAttachments?.find(a => (a as any).attachments?.original_name === fileName)
    if (attachment && (attachment as any).attachments) {
      await deleteFile((attachment as any).attachments.id, (attachment as any).attachments.storage_path)
      
      // Log file deletion
      await createAuditLogEntry('letter', letterId, 'file_delete', userId, {
        metadata: { file_name: fileName }
      })
    }
  }

  // Upload new files

  for (const file of newFiles) {
    const description = fileDescriptions?.[file.name] || undefined
    await uploadAndLinkFile({
      file,
      entityType: 'letter',
      entityId: letterId,
      description,
      userId
    })
    
    // Log file addition
    await createAuditLogEntry('letter', letterId, 'file_add', userId, {
      metadata: { 
        file_name: file.name,
        file_size: file.size,
        description: description
      }
    })
  }
}

/**
 * Delete letter attachment with recognition records
 */
export async function deleteLetterAttachment(
  attachmentId: string,
  storagePath: string,
  letterId: string
): Promise<void> {
  console.log('[letterFiles.deleteLetterAttachment] Deleting attachment:', attachmentId)

  // Get current user
  const { data: { session } } = await supabase.auth.getSession()
  const userId = session?.user?.id

  if (!userId) {
    throw new Error('User not authenticated')
  }

  // Delete recognition records first (both as original and recognized)
  const { error: recognitionError1 } = await supabase
    .from('attachment_recognitions')
    .delete()
    .eq('original_attachment_id', attachmentId)

  if (recognitionError1) {
    console.error('[letterFiles.deleteLetterAttachment] Recognition delete error (original):', recognitionError1)
  }

  const { error: recognitionError2 } = await supabase
    .from('attachment_recognitions')
    .delete()
    .eq('recognized_attachment_id', attachmentId)

  if (recognitionError2) {
    console.error('[letterFiles.deleteLetterAttachment] Recognition delete error (recognized):', recognitionError2)
  }

  // Delete file (cascades letter_attachments)
  await deleteFile(attachmentId, storagePath)

  // Log deletion
  await createAuditLogEntry('letter', letterId, 'file_delete', userId, {
    metadata: { attachment_id: attachmentId }
  })

  console.log('[letterFiles.deleteLetterAttachment] Attachment deleted successfully')
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
