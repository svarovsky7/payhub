import { useState, useEffect } from 'react'
import type { FormInstance } from 'antd'
import type { UploadFile } from 'antd'
import dayjs from 'dayjs'
import { supabase } from '../lib/supabase'
import type { Letter, Contractor, UserProfile } from '../lib/supabase'
import type { ExistingFile, FileDescriptions } from '../components/common/FileUploadBlock'
import { getLetterAttachments } from '../services/letterOperations'

const LAST_SELECTED_PROJECT_KEY = 'lastSelectedLetterProject'

interface UseLetterFormDataProps {
  visible: boolean
  editingLetter: Letter | null
  form: FormInstance
  userId: string | undefined
  users: UserProfile[]
}

/**
 * Custom hook to manage letter form data loading and state
 */
export const useLetterFormData = ({
  visible,
  editingLetter,
  form,
  userId,
  users
}: UseLetterFormDataProps) => {
  const [contractors, setContractors] = useState<Contractor[]>([])
  const [fileList, setFileList] = useState<UploadFile[]>([])
  const [existingFiles, setExistingFiles] = useState<ExistingFile[]>([])
  const [fileDescriptions, setFileDescriptions] = useState<FileDescriptions>({})
  const [direction, setDirection] = useState<'incoming' | 'outgoing'>('incoming')
  const [senderType, setSenderType] = useState<'individual' | 'contractor'>('contractor')
  const [recipientType, setRecipientType] = useState<'individual' | 'contractor'>('contractor')
  const [selectedProjectId, setSelectedProjectId] = useState<number | undefined>()

  // Load contractors
  const loadContractors = async () => {
    console.log('[useLetterFormData] Loading contractors')
    try {
      const { data, error } = await supabase
        .from('contractors')
        .select('*')
        .order('name')

      if (error) throw error

      console.log('[useLetterFormData] Loaded contractors:', data?.length || 0)
      setContractors(data || [])
    } catch (error) {
      console.error('[useLetterFormData] Error loading contractors:', error)
    }
  }

  // Load existing files for a letter
  const loadExistingFiles = async (letterId: string) => {
    console.log('[useLetterFormData] Loading files for letter:', letterId)
    try {
      const attachments = await getLetterAttachments(letterId)
      const files: ExistingFile[] = attachments.map((att: any) => ({
        id: att.attachments.id,
        original_name: att.attachments.original_name,
        storage_path: att.attachments.storage_path,
        size_bytes: att.attachments.size_bytes,
        mime_type: att.attachments.mime_type || '',
        created_at: att.attachments.created_at,
        attachment_id: att.id
      }))
      setExistingFiles(files)
    } catch (error) {
      console.error('[useLetterFormData] Error loading files:', error)
    }
  }

  // Load contractors when modal opens
  useEffect(() => {
    if (visible) {
      loadContractors()
    }
  }, [visible])

  // Populate form when editing or creating
  useEffect(() => {
    if (visible && editingLetter) {
      console.log('[useLetterFormData] Populating form with:', editingLetter)

      // Determine responsible person name
      let responsibleName = editingLetter.responsible_person_name
      if (!responsibleName && editingLetter.responsible_user_id) {
        const user = users.find(u => u.id === editingLetter.responsible_user_id)
        if (user) {
          responsibleName = user.full_name
        }
      }

      form.setFieldsValue({
        project_id: editingLetter.project_id,
        number: editingLetter.number,
        status_id: editingLetter.status_id,
        letter_date: editingLetter.letter_date ? dayjs(editingLetter.letter_date) : null,
        subject: editingLetter.subject,
        content: editingLetter.content,
        responsible_person_name: responsibleName,
        sender: editingLetter.sender,
        sender_type: editingLetter.sender_type || 'individual',
        sender_contractor_id: editingLetter.sender_contractor_id,
        recipient: editingLetter.recipient,
        recipient_type: editingLetter.recipient_type || 'individual',
        recipient_contractor_id: editingLetter.recipient_contractor_id,
        direction: editingLetter.direction,
        reg_number: editingLetter.reg_number,
        reg_date: editingLetter.reg_date ? dayjs(editingLetter.reg_date) : null,
        delivery_method: editingLetter.delivery_method,
        response_deadline: editingLetter.response_deadline ? dayjs(editingLetter.response_deadline) : null
      })

      setDirection(editingLetter.direction)
      setSenderType(editingLetter.sender_type || 'individual')
      setRecipientType(editingLetter.recipient_type || 'individual')
      setSelectedProjectId(editingLetter.project_id || undefined)

      if (editingLetter.id) {
        loadExistingFiles(editingLetter.id)
      }
    } else if (visible && !editingLetter) {
      // Reset for new letter
      form.resetFields()
      setFileList([])
      setExistingFiles([])
      setFileDescriptions({})
      setSenderType('contractor')
      setRecipientType('contractor')

      // Load last selected project
      const lastProjectId = localStorage.getItem(LAST_SELECTED_PROJECT_KEY)
      const projectId = lastProjectId ? parseInt(lastProjectId, 10) : undefined

      form.setFieldsValue({
        direction: 'incoming',
        status_id: 1,
        reg_date: dayjs(),
        created_by: userId,
        project_id: projectId,
        sender_type: 'contractor',
        recipient_type: 'contractor'
      })

      setSelectedProjectId(projectId)
    }
  }, [visible, editingLetter, form, userId, users])

  return {
    contractors,
    fileList,
    setFileList,
    existingFiles,
    setExistingFiles,
    fileDescriptions,
    setFileDescriptions,
    direction,
    setDirection,
    senderType,
    setSenderType,
    recipientType,
    setRecipientType,
    selectedProjectId,
    setSelectedProjectId,
    loadContractors,
    loadExistingFiles
  }
}
