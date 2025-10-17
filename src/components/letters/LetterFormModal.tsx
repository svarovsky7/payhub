import { Modal, Form, Input, DatePicker, Select, Radio, Button, Row, Col, message, Space, Tooltip, AutoComplete, Tag } from 'antd'
import { ReloadOutlined, DownloadOutlined, UserAddOutlined } from '@ant-design/icons'
import { useEffect, useState } from 'react'
import type { UploadFile } from 'antd'
import dayjs from 'dayjs'
import type { Letter, LetterStatus, Project, UserProfile, Contractor } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { generateRegNumber, getLetterAttachments } from '../../services/letterOperations'
import { supabase } from '../../lib/supabase'
import { FileUploadBlock, type ExistingFile, type FileDescriptions } from '../common/FileUploadBlock'
import { downloadLetterDocument } from '../../services/letterDocumentService'
import { AddContractorModal } from '../common/AddContractorModal'

const { TextArea } = Input
const { Option } = Select

const LAST_SELECTED_PROJECT_KEY = 'lastSelectedLetterProject'

interface LetterFormModalProps {
  visible: boolean
  onCancel: () => void
  onSubmit: (values: any, files: File[], originalFiles: string[]) => Promise<void>
  editingLetter: Letter | null
  letterStatuses: LetterStatus[]
  projects: Project[]
  users: UserProfile[]
  letters?: Letter[] // History for popular contractors calculation
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
  const [fileList, setFileList] = useState<UploadFile[]>([])
  const [existingFiles, setExistingFiles] = useState<ExistingFile[]>([])
  const [fileDescriptions, setFileDescriptions] = useState<FileDescriptions>({})
  const [contractors, setContractors] = useState<Contractor[]>([])
  const [direction, setDirection] = useState<'incoming' | 'outgoing'>('incoming')
  const [downloadingDocument, setDownloadingDocument] = useState(false)
  const [, setFormChanged] = useState(0) // Counter to trigger re-render
  const [senderType, setSenderType] = useState<'individual' | 'contractor'>('contractor')
  const [recipientType, setRecipientType] = useState<'individual' | 'contractor'>('contractor')
  const [addContractorModalVisible, setAddContractorModalVisible] = useState(false)
  const [selectedProjectId, setSelectedProjectId] = useState<number | undefined>()
  const [topSenders, setTopSenders] = useState<Contractor[]>([])
  const [topRecipients, setTopRecipients] = useState<Contractor[]>([])

  // Calculate top 2 popular contractors based on letter history and selected project
  useEffect(() => {
    if (!selectedProjectId || !letters.length || !contractors.length) {
      setTopSenders([])
      setTopRecipients([])
      return
    }

    // Filter letters by selected project
    const projectLetters = letters.filter(letter => letter.project_id === selectedProjectId)

    // Count sender contractors
    const senderCounts = new Map<number, number>()
    projectLetters.forEach(letter => {
      if (letter.sender_contractor_id) {
        senderCounts.set(letter.sender_contractor_id, (senderCounts.get(letter.sender_contractor_id) || 0) + 1)
      }
    })

    // Count recipient contractors
    const recipientCounts = new Map<number, number>()
    projectLetters.forEach(letter => {
      if (letter.recipient_contractor_id) {
        recipientCounts.set(letter.recipient_contractor_id, (recipientCounts.get(letter.recipient_contractor_id) || 0) + 1)
      }
    })

    // Get top 2 senders
    const sortedSenders = Array.from(senderCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([id]) => contractors.find(c => c.id === id))
      .filter(Boolean) as Contractor[]

    // Get top 2 recipients
    const sortedRecipients = Array.from(recipientCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([id]) => contractors.find(c => c.id === id))
      .filter(Boolean) as Contractor[]

    setTopSenders(sortedSenders)
    setTopRecipients(sortedRecipients)
  }, [selectedProjectId, letters, contractors])

  // Load existing files for a letter
  const loadExistingFiles = async (letterId: string) => {
    console.log('[LetterFormModal.loadExistingFiles] Loading files for letter:', letterId)
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
      console.error('[LetterFormModal.loadExistingFiles] Error:', error)
    }
  }

  // Load contractors
  const loadContractors = async () => {
    console.log('[LetterFormModal] Loading contractors')
    try {
      const { data, error } = await supabase
        .from('contractors')
        .select('*')
        .order('name')

      if (error) throw error

      console.log('[LetterFormModal] Loaded contractors:', data?.length || 0)
      setContractors(data || [])
    } catch (error) {
      console.error('[LetterFormModal] Error loading contractors:', error)
    }
  }

  useEffect(() => {
    if (visible) {
      loadContractors()
    }
  }, [visible])

  // Populate form when editing
  useEffect(() => {
    if (visible && editingLetter) {
      console.log('[LetterFormModal] Populating form with:', editingLetter)

      // Determine responsible person name
      let responsibleName = editingLetter.responsible_person_name
      if (!responsibleName && editingLetter.responsible_user_id) {
        // If we have user_id but no name, try to find the user's name
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

      // Set direction and types for dynamic UI
      setDirection(editingLetter.direction)
      setSenderType(editingLetter.sender_type || 'individual')
      setRecipientType(editingLetter.recipient_type || 'individual')
      setSelectedProjectId(editingLetter.project_id || undefined)

      // Load existing files
      if (editingLetter.id) {
        loadExistingFiles(editingLetter.id)
      }
    } else if (visible && !editingLetter) {
      // Reset form for new letter
      form.resetFields()
      setFileList([])
      setExistingFiles([])
      setFileDescriptions({})
      setSenderType('contractor')
      setRecipientType('contractor')

      // Load last selected project from localStorage
      const lastProjectId = localStorage.getItem(LAST_SELECTED_PROJECT_KEY)
      const projectId = lastProjectId ? parseInt(lastProjectId, 10) : undefined

      // Set defaults
      form.setFieldsValue({
        direction: 'incoming',
        status_id: 1, // Default to "Новое"
        reg_date: dayjs(), // Registration date is today
        created_by: user?.id,
        project_id: projectId,
        sender_type: 'contractor',
        recipient_type: 'contractor'
      })

      // Set selected project ID for popular contractors calculation
      setSelectedProjectId(projectId)
    }
  }, [visible, editingLetter, form, user])

  const handleProjectChange = (projectId: number) => {
    console.log('[LetterFormModal.handleProjectChange] Saving last selected project:', projectId)
    if (projectId) {
      localStorage.setItem(LAST_SELECTED_PROJECT_KEY, projectId.toString())
    }
    setSelectedProjectId(projectId)
    setFormChanged(prev => prev + 1) // Trigger re-render
  }

  const handleDirectionChange = (e: any) => {
    setDirection(e.target.value)
    setFormChanged(prev => prev + 1) // Trigger re-render
  }

  const handleRegNumberChange = () => {
    setFormChanged(prev => prev + 1) // Trigger re-render
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
      // Get current form values
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
      setFormChanged(prev => prev + 1) // Trigger re-render
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

      // Convert dates to strings and empty strings to null
      const formData = {
        ...values,
        number: values.number?.trim() || null, // Empty string becomes null
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

      // Get new files (not from server)
      const newFiles = fileList
        .filter(f => f.originFileObj)
        .map(f => f.originFileObj as File)

      // Get original file names (from existing files on server)
      const originalFiles = existingFiles.map(f => f.original_name)

      await onSubmit(formData, newFiles, originalFiles)

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
    onCancel()
  }

  // Check if download button should be enabled
  const canDownloadDocument = (): boolean => {
    const formDirection = form.getFieldValue('direction')
    const projectId = form.getFieldValue('project_id')
    const regNumber = form.getFieldValue('reg_number')

    return formDirection === 'outgoing' && !!projectId && !!regNumber
  }

  const handleDownloadDocument = async () => {
    console.log('[LetterFormModal.handleDownloadDocument] Starting document download')

    // Get current form values
    const formDirection = form.getFieldValue('direction')
    const projectId = form.getFieldValue('project_id')
    const regNumber = form.getFieldValue('reg_number')

    // Validate conditions
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
        // For existing letters, use the letter object
        await downloadLetterDocument(editingLetter)
      } else {
        // For new letters, create a temporary letter object from form values
        const formValues = form.getFieldsValue()
        const tempLetter: Letter = {
          id: crypto.randomUUID(), // Temporary UUID
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
        await downloadLetterDocument(tempLetter)
      }
      message.success('Документ успешно сгенерирован и загружен')
    } catch (error: unknown) {
      console.error('[LetterFormModal.handleDownloadDocument] Error:', error)
      if (error instanceof Error) {
        if (error.message?.includes('Template file not found') || error.message?.includes('not found')) {
          message.error('Шаблон документа не найден. Загрузите шаблон в разделе Администрирование → Шаблоны документов')
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

  const handleContractorCreated = async (newContractor: Contractor) => {
    console.log('[LetterFormModal.handleContractorCreated] New contractor:', newContractor)
    // Reload contractors list
    await loadContractors()
    // Auto-select the new contractor
    setRecipientType('contractor')
    form.setFieldsValue({
      recipient_type: 'contractor',
      recipient_contractor_id: newContractor.id,
      recipient: null
    })
    // Close modal
    setAddContractorModalVisible(false)
  }

  // Show download button only for outgoing letters
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
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="Направление"
              name="direction"
              rules={[{ required: true, message: 'Выберите направление' }]}
            >
              <Radio.Group onChange={handleDirectionChange}>
                <Radio value="incoming">Входящее</Radio>
                <Radio value="outgoing">Исходящее</Radio>
              </Radio.Group>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="Проект"
              name="project_id"
            >
              <Select
                placeholder="Выберите проект"
                allowClear
                showSearch
                optionFilterProp="children"
                onChange={handleProjectChange}
              >
                {projects.map(project => (
                  <Option key={project.id} value={project.id}>
                    {project.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="Номер письма"
              name="number"
            >
              <Input placeholder="Например: №123/ИСХ-2025" autoComplete="off" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="Регистрационный номер"
              name="reg_number"
            >
              <Input placeholder="Внутренний номер (необязательно)" onChange={handleRegNumberChange} autoComplete="off" />
            </Form.Item>
            <Button
              type="primary"
              icon={<ReloadOutlined />}
              loading={generatingRegNumber}
              onClick={handleGenerateRegNumber}
              style={{
                backgroundColor: '#52c41a',
                borderColor: '#52c41a',
                marginTop: -8,
                width: '100%'
              }}
            >
              Сгенерировать
            </Button>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="Дата письма"
              name="letter_date"
              rules={[{ required: true, message: 'Выберите дату письма' }]}
            >
              <DatePicker format="DD.MM.YYYY" style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="Дата регистрации"
              name="reg_date"
            >
              <DatePicker format="DD.MM.YYYY" style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={24}>
            <Form.Item
              label={
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>Регламентный срок ответа</span>
                  <Space size={4}>
                    <Button
                      size="small"
                      type="default"
                      onClick={() => {
                        const regDate = form.getFieldValue('reg_date')
                        if (regDate) {
                          form.setFieldsValue({ response_deadline: regDate.add(3, 'day') })
                        } else {
                          message.warning('Сначала заполните дату регистрации')
                        }
                      }}
                      style={{ fontSize: 11, height: 22, padding: '0 8px' }}
                    >
                      +3 дня
                    </Button>
                    <Button
                      size="small"
                      type="default"
                      onClick={() => {
                        const regDate = form.getFieldValue('reg_date')
                        if (regDate) {
                          form.setFieldsValue({ response_deadline: regDate.add(5, 'day') })
                        } else {
                          message.warning('Сначала заполните дату регистрации')
                        }
                      }}
                      style={{ fontSize: 11, height: 22, padding: '0 8px' }}
                    >
                      +5 дней
                    </Button>
                    <Button
                      size="small"
                      type="default"
                      onClick={() => {
                        const regDate = form.getFieldValue('reg_date')
                        if (regDate) {
                          form.setFieldsValue({ response_deadline: regDate.add(10, 'day') })
                        } else {
                          message.warning('Сначала заполните дату регистрации')
                        }
                      }}
                      style={{ fontSize: 11, height: 22, padding: '0 8px' }}
                    >
                      +10 дней
                    </Button>
                  </Space>
                </div>
              }
              name="response_deadline"
            >
              <DatePicker format="DD.MM.YYYY" style={{ width: '100%' }} placeholder="Выберите срок ответа" />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          label="Тема"
          name="subject"
        >
          <Input placeholder="Краткая тема письма" autoComplete="off" />
        </Form.Item>

        <Form.Item
          label="Содержание"
          name="content"
        >
          <TextArea rows={3} placeholder="Краткое изложение содержания письма" />
        </Form.Item>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="Отправитель">
              <Space direction="vertical" style={{ width: '100%' }}>
                <Form.Item name="sender_type" noStyle>
                  <Radio.Group
                    value={senderType}
                    onChange={(e) => {
                      setSenderType(e.target.value)
                      form.setFieldValue('sender_type', e.target.value)
                      // Clear fields when switching type
                      if (e.target.value === 'individual') {
                        form.setFieldValue('sender_contractor_id', null)
                      } else {
                        form.setFieldValue('sender', null)
                      }
                    }}
                    size="small"
                  >
                    <Radio value="contractor">Контрагент</Radio>
                    <Radio value="individual">Физ. лицо</Radio>
                  </Radio.Group>
                </Form.Item>

                {senderType === 'individual' ? (
                  <Form.Item name="sender" noStyle>
                    <Input placeholder="Введите ФИО" allowClear />
                  </Form.Item>
                ) : (
                  <Form.Item name="sender_contractor_id" noStyle>
                    <Select
                      placeholder="Выберите контрагента"
                      allowClear
                      showSearch
                      optionFilterProp="children"
                      filterOption={(input, option) =>
                        (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                      }
                      options={contractors.map(contractor => ({
                        value: contractor.id,
                        label: contractor.name
                      }))}
                    />
                  </Form.Item>
                )}

                {topSenders.length > 0 && (
                  <Space wrap style={{ marginTop: 4 }}>
                    {topSenders.map((contractor, index) => (
                      <Tag
                        key={contractor.id}
                        color={index === 0 ? 'green' : 'cyan'}
                        style={{ cursor: 'pointer' }}
                        onClick={() => {
                          setSenderType('contractor')
                          form.setFieldsValue({
                            sender_type: 'contractor',
                            sender_contractor_id: contractor.id,
                            sender: null
                          })
                        }}
                      >
                        {contractor.name}
                      </Tag>
                    ))}
                  </Space>
                )}
              </Space>
            </Form.Item>
          </Col>

          <Col span={12}>
            <Form.Item
              label={
                <Space>
                  <span>Получатель</span>
                  <Tooltip title="Добавить контрагента">
                    <UserAddOutlined
                      style={{
                        fontSize: 14,
                        color: '#1890ff',
                        cursor: 'pointer'
                      }}
                      onClick={() => setAddContractorModalVisible(true)}
                    />
                  </Tooltip>
                </Space>
              }
            >
              <Space direction="vertical" style={{ width: '100%' }}>
                <Form.Item name="recipient_type" noStyle>
                  <Radio.Group
                    value={recipientType}
                    onChange={(e) => {
                      setRecipientType(e.target.value)
                      form.setFieldValue('recipient_type', e.target.value)
                      // Clear fields when switching type
                      if (e.target.value === 'individual') {
                        form.setFieldValue('recipient_contractor_id', null)
                      } else {
                        form.setFieldValue('recipient', null)
                      }
                    }}
                    size="small"
                  >
                    <Radio value="contractor">Контрагент</Radio>
                    <Radio value="individual">Физ. лицо</Radio>
                  </Radio.Group>
                </Form.Item>

                {recipientType === 'individual' ? (
                  <Form.Item name="recipient" noStyle>
                    <Input placeholder="Введите ФИО" allowClear />
                  </Form.Item>
                ) : (
                  <Form.Item name="recipient_contractor_id" noStyle>
                    <Select
                      placeholder="Выберите контрагента"
                      allowClear
                      showSearch
                      optionFilterProp="children"
                      filterOption={(input, option) =>
                        (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                      }
                      options={contractors.map(contractor => ({
                        value: contractor.id,
                        label: contractor.name
                      }))}
                    />
                  </Form.Item>
                )}

                {topRecipients.length > 0 && (
                  <Space wrap style={{ marginTop: 4 }}>
                    {topRecipients.map((contractor, index) => (
                      <Tag
                        key={contractor.id}
                        color={index === 0 ? 'green' : 'cyan'}
                        style={{ cursor: 'pointer' }}
                        onClick={() => {
                          setRecipientType('contractor')
                          form.setFieldsValue({
                            recipient_type: 'contractor',
                            recipient_contractor_id: contractor.id,
                            recipient: null
                          })
                        }}
                      >
                        {contractor.name}
                      </Tag>
                    ))}
                  </Space>
                )}
              </Space>
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          label="Ответственный"
          name="responsible_person_name"
        >
          <AutoComplete
            placeholder="Выберите из списка или введите имя"
            allowClear
            options={users.map(user => ({
              value: user.full_name,
              label: user.full_name
            }))}
            filterOption={(inputValue, option) =>
              option?.value.toUpperCase().indexOf(inputValue.toUpperCase()) !== -1
            }
          />
        </Form.Item>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="Статус"
              name="status_id"
              rules={[{ required: true, message: 'Выберите статус' }]}
            >
              <Select placeholder="Выберите статус">
                {letterStatuses.map(status => (
                  <Option key={status.id} value={status.id}>
                    {status.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label={direction === 'incoming' ? 'Способ доставки' : 'Способ отправки'}
              name="delivery_method"
            >
              <Select
                placeholder={direction === 'incoming' ? 'Выберите способ доставки' : 'Выберите способ отправки'}
                allowClear
              >
                <Option value="почта">Почта</Option>
                <Option value="email">Email</Option>
                <Option value="курьер">Курьер</Option>
                <Option value="ЭДО">ЭДО</Option>
                <Option value="факс">Факс</Option>
                <Option value="другое">Другое</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Form.Item label="Файлы">
          <FileUploadBlock
            entityType={"letter" as any}
            fileList={fileList}
            onFileListChange={setFileList}
            existingFiles={existingFiles}
            onExistingFilesChange={editingLetter?.id ? () => loadExistingFiles(editingLetter.id) : undefined}
            fileDescriptions={fileDescriptions}
            onFileDescriptionChange={handleFileDescriptionChange}
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
