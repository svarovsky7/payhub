import { message } from 'antd'
import { supabase } from '../lib/supabase'
import { createAuditLogEntry } from '../services/auditLogService'
import { getRecognizedAttachmentId } from '../services/attachmentRecognitionService'

interface SaveAttachmentOptions {
  letterId: string
  attachmentId: string
  attachmentName: string
  markdown: string
}

export const useAttachmentSaver = () => {
  const saveMarkdownAttachment = async ({
    letterId,
    attachmentId,
    attachmentName,
    markdown
  }: SaveAttachmentOptions): Promise<void> => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Пользователь не авторизован')

    const oldRecognizedId = await getRecognizedAttachmentId(attachmentId)

    const baseName = attachmentName.replace(/\.[^/.]+$/, '')
    const displayFileName = `${baseName}_распознано.md`
    const blob = new Blob([markdown], { type: 'text/markdown' })
    
    const sanitizedName = baseName.replace(/[^\w\s.-]/g, '').replace(/\s+/g, '_')
    const storagePath = `letters/${letterId}/${Date.now()}_recognized.md`
    const file = new File([blob], sanitizedName + '_recognized.md')
    
    const { error: uploadError } = await supabase.storage
      .from('attachments')
      .upload(storagePath, file)

    if (uploadError) throw uploadError

    const { data: newAttachment, error: dbError } = await supabase
      .from('attachments')
      .insert({
        original_name: displayFileName,
        storage_path: storagePath,
        size_bytes: blob.size,
        mime_type: 'text/markdown',
        description: `Распознанный текст из ${attachmentName}`,
        created_by: user.id
      })
      .select()
      .single()
    
    if (dbError) throw dbError
    if (!newAttachment) throw new Error('Не удалось создать запись о вложении')

    if (oldRecognizedId) {
      const { error: updateError } = await supabase
        .from('attachment_recognitions')
        .update({ recognized_attachment_id: newAttachment.id })
        .eq('original_attachment_id', attachmentId)

      if (updateError) throw updateError

      await supabase
        .from('letter_attachments')
        .delete()
        .eq('attachment_id', oldRecognizedId)

      const { data: oldAttachment } = await supabase
        .from('attachments')
        .select('storage_path')
        .eq('id', oldRecognizedId)
        .single()

      if (oldAttachment) {
        await supabase.storage.from('attachments').remove([oldAttachment.storage_path])
      }
      
      await supabase.from('attachments').delete().eq('id', oldRecognizedId)
    } else {
      const { error: linkError } = await supabase
        .from('attachment_recognitions')
        .insert({
          original_attachment_id: attachmentId,
          recognized_attachment_id: newAttachment.id,
          created_by: user.id
        })

      if (linkError) throw linkError
    }

    const { error: letterLinkError } = await supabase
      .from('letter_attachments')
      .insert({
        letter_id: letterId,
        attachment_id: newAttachment.id
      })

    if (letterLinkError) throw letterLinkError

    await createAuditLogEntry(
      'letter',
      letterId,
      'file_add',
      user.id,
      {
        fieldName: 'recognized_attachment',
        newValue: displayFileName,
        metadata: {
          file_id: newAttachment.id,
          file_name: displayFileName,
          file_size: blob.size,
          mime_type: 'text/markdown',
          original_file: attachmentName,
          description: `Распознанный текст из файла "${attachmentName}"`
        }
      }
    )

    message.success('Изменения сохранены')
  }

  return { saveMarkdownAttachment }
}

