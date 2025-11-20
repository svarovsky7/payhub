import { Modal, Form, Button, Space, Tooltip, message } from 'antd'
import { DownloadOutlined } from '@ant-design/icons'
import { useState, useEffect } from 'react'
import type { Letter, LetterStatus, Project, UserProfile, Contractor } from '../../lib/supabase'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { generateRegNumber } from '../../services/letterOperations'
import { FileUploadBlock } from '../common/FileUploadBlock'
import { downloadLetterDocument } from '../../services/letterDocumentService'
import { AddContractorModal } from '../common/AddContractorModal'
import { useLetterFormData } from '../../hooks/useLetterFormData'
import { usePopularContractors } from '../../hooks/usePopularContractors'
import { LetterBasicFields } from './LetterBasicFields'
import { LetterParticipantsSection } from './LetterParticipantsSection'
import { LetterDetailsSection } from './LetterDetailsSection'
import { generateShareToken } from '../../utils/shareToken'

const LAST_SELECTED_PROJECT_KEY = 'lastSelectedLetterProject'

interface LetterFormModalProps {
  visible: boolean
  onCancel: () => void
  onSubmit: (values: any, files: File[], originalFiles: string[], fileDescriptions: Record<string, string>, existingFileDescriptions: Record<string, string>) => Promise<void>
  editingLetter: Letter | null
  letterStatuses: LetterStatus[]
  projects: Project[]
  users: UserProfile[]
  letters?: Letter[]
}

export const LetterFormModal: React.FC<LetterFormModalProps> = ({
  visible,
  onCancel,
  onSubmit,
  editingLetter,
  letterStatuses,
  projects,
  users,
  letters = []
}) => {
  const [form] = Form.useForm()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [generatingRegNumber, setGeneratingRegNumber] = useState(false)
  const [downloadingDocument, setDownloadingDocument] = useState(false)
  const [, setFormChanged] = useState(0)
  const [addContractorModalVisible, setAddContractorModalVisible] = useState(false)
  const [qrLink, setQrLink] = useState<string | null>(null)
  const [publicShareToken, setPublicShareToken] = useState<string | null>(null)

  // Use custom hooks for form data management
  const {
    contractors,
    fileList,
    setFileList,
    existingFiles,
    setExistingFiles,
    fileDescriptions,
    setFileDescriptions,
    existingFileDescriptions,
    setExistingFileDescriptions,
    handleExistingFileDescriptionChange,
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
  } = useLetterFormData({
    visible,
    editingLetter,
    form,
    userId: user?.id,
    users
  })

  // Load or generate public share token when modal opens
  useEffect(() => {
    if (visible) {
      if (editingLetter?.id) {
        // For existing letter - load token from DB
        loadQRLink(editingLetter.id)
      } else {
        // For new letter - generate token locally
        generateNewPublicShareToken()
      }
    } else {
      setQrLink(null)
      setPublicShareToken(null)
    }
  }, [visible, editingLetter])

  const generateNewPublicShareToken = () => {
    const token = generateShareToken()
    setPublicShareToken(token)
    const baseUrl = window.location.origin
    setQrLink(`${baseUrl}/letter-share/${token}`)
  }

  const loadQRLink = async (letterId: string) => {
    try {
      // Just load the existing token from DB
      const { data } = await supabase
        .from('letter_public_shares')
        .select('token')
        .eq('letter_id', letterId)
        .single()

      if (data?.token) {
        const baseUrl = window.location.origin
        const link = `${baseUrl}/letter-share/${data.token}`
        setQrLink(link)
        setPublicShareToken(data.token)
      }
    } catch (error) {
      console.error('[LetterFormModal.loadQRLink] Error:', error)
    }
  }

  // Use popular contractors hook
  const { topSenders, topRecipients } = usePopularContractors(
    selectedProjectId,
    letters,
    contractors
  )

  const handleProjectChange = (projectId: number) => {
    console.log('[LetterFormModal.handleProjectChange] Saving last selected project:', projectId)
    if (projectId) {
      localStorage.setItem(LAST_SELECTED_PROJECT_KEY, projectId.toString())
    }
    setSelectedProjectId(projectId)
    setFormChanged(prev => prev + 1)
  }

  const handleDirectionChange = (e: any) => {
    setDirection(e.target.value)
    setFormChanged(prev => prev + 1)
  }

  const handleRegNumberChange = () => {
    setFormChanged(prev => prev + 1)
  }

  const handleFileDescriptionChange = (uid: string, description: string) => {
    console.log('[LetterFormModal.handleFileDescriptionChange] Setting description for file:', uid)
    setFileDescriptions(prev => ({
      ...prev,
      [uid]: description
    }))
  }

  const handleGenerateRegNumber = async () => {
    console.log('[LetterFormModal.handleGenerateRegNumber] Generating registration number')

    try {
      const projectId = form.getFieldValue('project_id')
      const direction = form.getFieldValue('direction')

      if (!projectId) {
        message.warning('Сначала выберите проект')
        return
      }

      if (!direction) {
        message.warning('Сначала выберите направление')
        return
      }

      setGeneratingRegNumber(true)

      const regNumber = await generateRegNumber(projectId, direction)
      form.setFieldsValue({ reg_number: regNumber })
      setFormChanged(prev => prev + 1)
      message.success('Регистрационный номер сгенерирован')
    } catch (error) {
      console.error('[LetterFormModal.handleGenerateRegNumber] Error:', error)
      message.error('Ошибка генерации номера')
    } finally {
      setGeneratingRegNumber(false)
    }
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      console.log('[LetterFormModal.handleSubmit] Values:', values)

      setLoading(true)

      const formData = {
        ...values,
        number: values.number?.trim() || null,
        subject: values.subject?.trim() || null,
        content: values.content?.trim() || null,
        sender: values.sender?.trim() || null,
        sender_type: values.sender_type || 'contractor',
        sender_contractor_id: values.sender_contractor_id || null,
        recipient: values.recipient?.trim() || null,
        recipient_type: values.recipient_type || 'contractor',
        recipient_contractor_id: values.recipient_contractor_id || null,
        delivery_method: values.delivery_method?.trim() || null,
        letter_date: values.letter_date ? values.letter_date.format('YYYY-MM-DD') : null,
        reg_date: values.reg_date ? values.reg_date.format('YYYY-MM-DD') : null,
        response_deadline: values.response_deadline ? values.response_deadline.format('YYYY-MM-DD') : null,
        created_by: editingLetter ? editingLetter.created_by : user?.id
      }

      const newFiles = fileList
        .filter(f => f.originFileObj)
        .map(f => f.originFileObj as File)

      const originalFiles = existingFiles.map(f => f.original_name)

      // Convert fileDescriptions from uid-based to filename-based
      const fileDescriptionsByName: Record<string, string> = {}
      fileList.forEach(f => {
        if (f.uid && fileDescriptions[f.uid] && f.originFileObj) {
          fileDescriptionsByName[f.originFileObj.name] = fileDescriptions[f.uid]
        }
      })

      // Pass public share token separately via context, don't add to formData
      const contextData = {
        formData,
        publicShareToken: !editingLetter ? publicShareToken : undefined
      }
      await onSubmit(contextData, newFiles, originalFiles, fileDescriptionsByName, existingFileDescriptions)

      form.resetFields()
      setFileList([])
      setExistingFiles([])
      setFileDescriptions({})
    } catch (error) {
      console.error('[LetterFormModal.handleSubmit] Validation error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    form.resetFields()
    setFileList([])
    setExistingFiles([])
    setFileDescriptions({})
    setExistingFileDescriptions({})
    onCancel()
  }

  const handleContractorCreated = async (newContractor: Contractor) => {
    console.log('[LetterFormModal.handleContractorCreated] New contractor:', newContractor)
    await loadContractors()
    setRecipientType('contractor')
    form.setFieldsValue({
      recipient_type: 'contractor',
      recipient_contractor_id: newContractor.id,
      recipient: null
    })
    setAddContractorModalVisible(false)
  }

  const canDownloadDocument = (): boolean => {
    const formDirection = form.getFieldValue('direction')
    const projectId = form.getFieldValue('project_id')
    const regNumber = form.getFieldValue('reg_number')

    return formDirection === 'outgoing' && !!projectId && !!regNumber
  }

  const handleDownloadDocument = async () => {
    console.log('[LetterFormModal.handleDownloadDocument] Starting document download')

    const formDirection = form.getFieldValue('direction')
    const projectId = form.getFieldValue('project_id')
    const regNumber = form.getFieldValue('reg_number')

    if (formDirection !== 'outgoing') {
      message.warning('Скачивание доступно только для исходящих писем')
      return
    }

    if (!projectId) {
      message.warning('Выберите проект')
      return
    }

    if (!regNumber) {
      message.warning('Заполните регистрационный номер')
      return
    }

    setDownloadingDocument(true)
    try {
      if (editingLetter) {
        await downloadLetterDocument(editingLetter)
      } else {
        const formValues = form.getFieldsValue()
        const tempLetter: Letter = {
          id: crypto.randomUUID(),
          project_id: formValues.project_id || null,
          number: formValues.number || '',
          status_id: formValues.status_id || 1,
          letter_date: formValues.letter_date ? formValues.letter_date.format('YYYY-MM-DD') : new Date().toISOString().split('T')[0],
          subject: formValues.subject || null,
          content: formValues.content || null,
          responsible_user_id: null,
          responsible_person_name: formValues.responsible_person_name || null,
          sender: formValues.sender || null,
          recipient: formValues.recipient || null,
          direction: 'outgoing',
          reg_number: regNumber,
          reg_date: formValues.reg_date ? formValues.reg_date.format('YYYY-MM-DD') : null,
          delivery_method: formValues.delivery_method || null,
          created_by: user?.id || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
        await downloadLetterDocument(tempLetter, publicShareToken || undefined)
      }
      message.success('Документ успешно сгенерирован и загружен')
    } catch (error: unknown) {
      console.error('[LetterFormModal.handleDownloadDocument] Error:', error)
      if (error instanceof Error) {
        if (error.message?.includes('Template file not found') || error.message?.includes('not found')) {
          message.error('Шаблон документа не найден. Загрузите шаблон для проекта или глобальный шаблон в разделе Администрирование → Шаблоны документов')
        } else {
          message.error('Ошибка генерации документа: ' + error.message)
        }
      } else {
        message.error('Ошибка генерации документа')
      }
    } finally {
      setDownloadingDocument(false)
    }
  }

  const showDownloadButton = direction === 'outgoing'
  const downloadButtonEnabled = canDownloadDocument()

  return (
    <Modal
      title={
        <Space>
          <span>{editingLetter ? 'Редактировать письмо' : 'Добавить письмо'}</span>
          {showDownloadButton && (
            <Tooltip
              title={
                !downloadButtonEnabled
                  ? 'Выберите проект и заполните регистрационный номер для скачивания'
                  : 'Скачать письмо с QR-кодом в формате DOCX'
              }
            >
              <Button
                type="primary"
                icon={<DownloadOutlined />}
                onClick={handleDownloadDocument}
                loading={downloadingDocument}
                disabled={!downloadButtonEnabled}
                style={{ marginLeft: 16 }}
              >
                Скачать DOCX
              </Button>
            </Tooltip>
          )}
          {qrLink && (
            <Button
              type="link"
              onClick={() => {
                navigator.clipboard.writeText(qrLink)
                message.success('Ссылка скопирована')
              }}
            >
              Копировать ссылку
            </Button>
          )}
        </Space>
      }
      open={visible}
      onOk={handleSubmit}
      onCancel={handleCancel}
      confirmLoading={loading}
      width={1100}
      okText={editingLetter ? 'Сохранить' : 'Создать'}
      cancelText="Отмена"
    >
      <Form
        form={form}
        layout="vertical"
        size="middle"
        initialValues={{
          direction: 'incoming',
          status_id: 1,
          sender_type: 'contractor',
          recipient_type: 'contractor'
        }}
      >
        <LetterBasicFields
          form={form}
          projects={projects}
          generatingRegNumber={generatingRegNumber}
          onDirectionChange={handleDirectionChange}
          onProjectChange={handleProjectChange}
          onGenerateRegNumber={handleGenerateRegNumber}
          onRegNumberChange={handleRegNumberChange}
        />

        <LetterParticipantsSection
          form={form}
          contractors={contractors}
          topSenders={topSenders}
          topRecipients={topRecipients}
          senderType={senderType}
          recipientType={recipientType}
          setSenderType={setSenderType}
          setRecipientType={setRecipientType}
          onAddContractorClick={() => setAddContractorModalVisible(true)}
        />

        <LetterDetailsSection
          letterStatuses={letterStatuses}
          users={users}
          direction={direction}
          selectedProjectId={selectedProjectId}
          letters={letters}
          form={form}
        />

        <Form.Item label="Файлы">
          <FileUploadBlock
            entityType={"letter" as any}
            fileList={fileList}
            onFileListChange={setFileList}
            existingFiles={existingFiles}
            onExistingFilesChange={editingLetter?.id ? () => loadExistingFiles(editingLetter.id) : undefined}
            fileDescriptions={fileDescriptions}
            onFileDescriptionChange={handleFileDescriptionChange}
            onExistingFileDescriptionChange={handleExistingFileDescriptionChange}
            multiple={true}
            maxSize={50}
          />
        </Form.Item>
      </Form>

      <AddContractorModal
        visible={addContractorModalVisible}
        onCancel={() => setAddContractorModalVisible(false)}
        onSuccess={handleContractorCreated}
      />
    </Modal>
  )
}
