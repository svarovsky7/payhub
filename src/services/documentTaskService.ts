import { supabase } from '../lib/supabase'
import type { DocumentTask, AttachmentWithRecognition } from '../types/documentTask'

export const documentTaskService = {
  async createTask(title: string, description?: string): Promise<DocumentTask> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Не авторизован')

    const { data, error } = await supabase
      .from('document_tasks')
      .insert({ title, description, created_by: user.id })
      .select()
      .single()

    if (error) throw error
    return data
  },

  async getTasks(): Promise<DocumentTask[]> {
    const { data, error } = await supabase
      .from('document_tasks')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  },


  async deleteTask(taskId: string): Promise<void> {
    const { error } = await supabase
      .from('document_tasks')
      .delete()
      .eq('id', taskId)

    if (error) throw error
  },

  async linkAttachment(taskId: string, attachmentId: string): Promise<void> {
    const { error } = await supabase
      .from('document_task_attachments')
      .insert({ task_id: taskId, attachment_id: attachmentId })

    if (error) throw error
  },

  async getTaskAttachments(taskId: string): Promise<AttachmentWithRecognition[]> {
    const { data, error } = await supabase
      .from('document_task_attachments')
      .select(`
        attachment_id,
        attachments (
          id,
          original_name,
          storage_path,
          size_bytes,
          mime_type,
          created_at
        )
      `)
      .eq('task_id', taskId)

    if (error) throw error

    const attachments = data?.map((item: any) => item.attachments).filter(Boolean) || []

    const attachmentIds = attachments.map(a => a.id)
    const { data: recognitions } = await supabase
      .from('attachment_recognitions')
      .select('*')
      .in('original_attachment_id', attachmentIds)

    const recognitionMap = new Map(recognitions?.map(r => [r.original_attachment_id, r]) || [])

    return attachments.map(att => ({
      ...att,
      recognition: recognitionMap.get(att.id)
    }))
  },

  async linkRecognizedFile(originalAttachmentId: string, recognizedAttachmentId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Не авторизован')

    const { error } = await supabase
      .from('attachment_recognitions')
      .insert({
        original_attachment_id: originalAttachmentId,
        recognized_attachment_id: recognizedAttachmentId,
        created_by: user.id
      })

    if (error) throw error
  },

  async uploadAttachment(taskId: string, file: File): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Не авторизован')

    const timestamp = Date.now()
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const storagePath = `document_tasks/${taskId}/${timestamp}_${cleanFileName}`

    const { error: uploadError } = await supabase.storage
      .from('attachments')
      .upload(storagePath, file)

    if (uploadError) throw uploadError

    const { data: attachment, error: insertError } = await supabase
      .from('attachments')
      .insert({
        original_name: file.name,
        storage_path: storagePath,
        size_bytes: file.size,
        mime_type: file.type,
        created_by: user.id
      })
      .select()
      .single()

    if (insertError) throw insertError

    await this.linkAttachment(taskId, attachment.id)

    return attachment.id
  },

  async createMarkdownAttachment(taskId: string, markdownContent: string, originalFileName: string): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Не авторизован')

    const timestamp = Date.now()
    const cleanFileName = originalFileName
      .replace(/\.[^/.]+$/, '')
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .substring(0, 50)
    const mdFileName = `${cleanFileName}_${timestamp}.md`
    const storagePath = `document_tasks/${taskId}/${mdFileName}`

    const blob = new Blob([markdownContent], { type: 'text/markdown' })

    const { error: uploadError } = await supabase.storage
      .from('attachments')
      .upload(storagePath, blob)

    if (uploadError) throw uploadError

    const { data: attachment, error: insertError } = await supabase
      .from('attachments')
      .insert({
        original_name: mdFileName,
        storage_path: storagePath,
        size_bytes: blob.size,
        mime_type: 'text/markdown',
        created_by: user.id
      })
      .select()
      .single()

    if (insertError) throw insertError

    await this.linkAttachment(taskId, attachment.id)

    return attachment.id
  },

  async deleteAttachment(attachmentId: string): Promise<void> {
    const { data: attachment } = await supabase
      .from('attachments')
      .select('storage_path')
      .eq('id', attachmentId)
      .single()

    if (!attachment) throw new Error('Файл не найден')

    const { data: recognition } = await supabase
      .from('attachment_recognitions')
      .select('recognized_attachment_id')
      .eq('original_attachment_id', attachmentId)
      .single()

    if (recognition?.recognized_attachment_id) {
      const { data: mdAttachment } = await supabase
        .from('attachments')
        .select('storage_path')
        .eq('id', recognition.recognized_attachment_id)
        .single()

      if (mdAttachment) {
        await supabase.storage
          .from('attachments')
          .remove([mdAttachment.storage_path])

        await supabase
          .from('document_task_attachments')
          .delete()
          .eq('attachment_id', recognition.recognized_attachment_id)

        await supabase
          .from('attachments')
          .delete()
          .eq('id', recognition.recognized_attachment_id)
      }

      await supabase
        .from('attachment_recognitions')
        .delete()
        .eq('original_attachment_id', attachmentId)
    }

    await supabase.storage
      .from('attachments')
      .remove([attachment.storage_path])

    await supabase
      .from('document_task_attachments')
      .delete()
      .eq('attachment_id', attachmentId)

    await supabase
      .from('attachments')
      .delete()
      .eq('id', attachmentId)
  }
}

