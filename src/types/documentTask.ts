export interface DocumentTask {
  id: string
  title: string
  description?: string
  created_by: string
  created_at: string
  updated_at: string
}

export interface DocumentTaskAttachment {
  id: string
  task_id: string
  attachment_id: string
  created_at: string
}

export interface AttachmentRecognition {
  id: string
  original_attachment_id: string
  recognized_attachment_id?: string
  created_at: string
  created_by?: string
}

export interface AttachmentWithRecognition {
  id: string
  original_name: string
  storage_path: string
  size_bytes: number
  mime_type: string
  created_at: string
  recognition?: AttachmentRecognition
}

