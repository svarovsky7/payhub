import { useState } from 'react'
import { message } from 'antd'
import { getLetterAttachments } from '../services/letter/letterFiles'
import { supabase } from '../lib/supabase'
import { getRecognitionStatuses } from '../services/attachmentRecognitionService'
import { getTaskByAttachmentId, getTaskProgress } from '../services/recognitionTaskService'

interface Attachment {
  id: string
  original_name: string
  storage_path: string
  mime_type: string
  url?: string
  recognized?: boolean
  recognizing?: boolean
  progress?: number
}

export const useAttachmentLoader = () => {
  const [loading, setLoading] = useState(false)
  const [attachments, setAttachments] = useState<Attachment[]>([])

  const loadAttachments = async (letterId: string, selectedAttachmentId?: string) => {
    setLoading(true)
    try {
      const data = await getLetterAttachments(letterId)
      
      const attachmentsWithUrls = await Promise.all(
        data.map(async (item: any) => {
          const att = item.attachments
          if (!att) return null

          const { data: urlData } = await supabase.storage
            .from('attachments')
            .createSignedUrl(att.storage_path, 3600)

          return {
            id: att.id,
            original_name: att.original_name,
            storage_path: att.storage_path,
            mime_type: att.mime_type,
            url: urlData?.signedUrl,
            recognized: false
          }
        })
      )

      const filtered = attachmentsWithUrls.filter(Boolean) as Attachment[]
      
      const ids = filtered.map(a => a.id)
      const statuses = await getRecognitionStatuses(ids)
      
      filtered.forEach(att => {
        att.recognized = statuses[att.id] || false
        const task = getTaskByAttachmentId(att.id)
        att.recognizing = !!task
        att.progress = task ? getTaskProgress(att.id) : 0
      })

      setAttachments(filtered)
      
      return selectedAttachmentId ? filtered.find(a => a.id === selectedAttachmentId) : undefined
    } catch (error) {
      message.error('Ошибка загрузки вложений')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  return {
    loading,
    attachments,
    setAttachments,
    loadAttachments
  }
}

