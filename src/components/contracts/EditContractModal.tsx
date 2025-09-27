import React, { useState, useEffect } from 'react'
import {
  Modal,
  Form,
  Input,
  DatePicker,
  Select,
  InputNumber,
  Upload,
  Button,
  message,
  Row,
  Col,
  Typography,
  Image,
  Space,
  Tag,
  Popconfirm,
  Tooltip
} from 'antd'
import {
  UploadOutlined,
  EyeOutlined,
  DeleteOutlined,
  FileTextOutlined,
  FilePdfOutlined,
  FileImageOutlined,
  FileExcelOutlined,
  FileWordOutlined,
  DownloadOutlined
} from '@ant-design/icons'
import dayjs from 'dayjs'
import type { UploadFile, RcFile } from 'antd/es/upload'
import { supabase } from '../../lib/supabase'
import {
  loadContractors,
  loadContractStatuses,
  loadProjects,
  type Contract
} from '../../services/contractOperations'

const { TextArea } = Input
const { Text } = Typography

interface EditContractModalProps {
  visible: boolean
  contract: Contract | null
  onCancel: () => void
  onSuccess: () => void
}

interface ContractorOption {
  value: number
  label: string
}

interface ContractStatus {
  id: number
  code: string
  name: string
  color?: string
}

interface Project {
  id: number
  code?: string
  name: string
  is_active: boolean
}

export const EditContractModal: React.FC<EditContractModalProps> = ({
  visible,
  contract,
  onCancel,
  onSuccess
}) => {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [contractors, setContractors] = useState<ContractorOption[]>([])
  const [contractStatuses, setContractStatuses] = useState<ContractStatus[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [fileList, setFileList] = useState<UploadFile[]>([])
  const [existingFiles, setExistingFiles] = useState<any[]>([])
  const [previewImage, setPreviewImage] = useState<string>('')
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewTitle, setPreviewTitle] = useState<string>('')
  const [previewType, setPreviewType] = useState<'image' | 'pdf'>('image')
  const [loadingFiles, setLoadingFiles] = useState(false)

  useEffect(() => {
    if (visible && contract) {
      loadInitialData()
      loadContractFiles()
    }
  }, [visible, contract])

  const loadInitialData = async () => {
    try {
      // Загружаем контрагентов
      const contractorsData = await loadContractors()
      setContractors(contractorsData.map(c => ({
        value: c.id,
        label: `${c.name} (ИНН: ${c.inn})`
      })))

      // Загружаем статусы договоров
      const statusesData = await loadContractStatuses()
      setContractStatuses(statusesData)

      // Загружаем проекты
      const projectsData = await loadProjects()
      setProjects(projectsData)

      // Устанавливаем значения формы из текущего договора
      if (contract) {
        form.setFieldsValue({
          contractNumber: contract.contract_number,
          contractDate: contract.contract_date ? dayjs(contract.contract_date) : null,
          statusId: contract.status_id,
          supplierId: contract.supplier_id,
          payerId: contract.payer_id,
          projectId: contract.project_id,
          vatRate: contract.vat_rate || 20,
          paymentTerms: contract.payment_terms,
          advancePercentage: contract.advance_percentage || 0,
          warrantyPeriodDays: contract.warranty_period_days,
          description: contract.description
        })
      }
    } catch (error) {
      console.error('[EditContractModal.loadInitialData] Error:', error)
      message.error('Ошибка загрузки данных')
    }
  }

  const loadContractFiles = async () => {
    if (!contract) return

    setLoadingFiles(true)
    try {
      const { data, error } = await supabase
        .from('contract_attachments')
        .select(`
          id,
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
        .eq('contract_id', contract.id)

      if (error) throw error

      setExistingFiles(data || [])
    } catch (error) {
      console.error('[EditContractModal.loadContractFiles] Error:', error)
      message.error('Ошибка загрузки файлов')
    } finally {
      setLoadingFiles(false)
    }
  }

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase()
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp'].includes(ext || '')) {
      return <FileImageOutlined />
    }
    if (ext === 'pdf') {
      return <FilePdfOutlined />
    }
    if (['doc', 'docx'].includes(ext || '')) {
      return <FileWordOutlined />
    }
    if (['xls', 'xlsx'].includes(ext || '')) {
      return <FileExcelOutlined />
    }
    return <FileTextOutlined />
  }

  const handlePreview = async (file: UploadFile) => {
    if (!file.url && !file.preview) {
      if (file.originFileObj) {
        const preview = await getBase64(file.originFileObj as RcFile)
        setPreviewImage(preview)
        setPreviewTitle(file.name || 'preview')
        setPreviewOpen(true)
      }
    } else {
      setPreviewImage(file.url || file.preview || '')
      setPreviewTitle(file.name || 'preview')
      setPreviewOpen(true)
    }
  }

  const handlePreviewExistingFile = async (file: any) => {
    try {
      const fileName = file.attachments?.original_name || ''
      const storagePath = file.attachments?.storage_path

      console.log('[EditContractModal.handlePreviewExistingFile] Previewing file:', {
        fileName,
        storagePath,
        fileData: file
      })

      if (!storagePath) {
        message.error('Путь к файлу не найден')
        return
      }

      // Проверяем тип файла
      const ext = fileName.split('.').pop()?.toLowerCase()
      const isImage = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'].includes(ext || '')
      const isPdf = ext === 'pdf'

      if (isImage || isPdf) {
        // Скачиваем файл для просмотра
        console.log('[EditContractModal.handlePreviewExistingFile] Downloading file for preview')

        const { data, error } = await supabase.storage
          .from('attachments')
          .download(storagePath)

        if (error) {
          console.error('[EditContractModal.handlePreviewExistingFile] Download error:', error)
          throw error
        }

        // Создаем URL для просмотра
        const url = URL.createObjectURL(data)

        if (isImage) {
          // Для изображений показываем в модальном окне
          console.log('[EditContractModal.handlePreviewExistingFile] Showing image preview')
          setPreviewImage(url)
          setPreviewTitle(fileName)
          setPreviewType('image')
          setPreviewOpen(true)

          // Очищаем URL после закрытия модального окна
          setTimeout(() => {
            if (!previewOpen) {
              URL.revokeObjectURL(url)
            }
          }, 5000)
        } else if (isPdf) {
          // Для PDF показываем в модальном окне
          console.log('[EditContractModal.handlePreviewExistingFile] Showing PDF preview')

          setPreviewImage(url)
          setPreviewTitle(fileName)
          setPreviewType('pdf')
          setPreviewOpen(true)

          // URL будет очищен при закрытии модального окна
        }
      } else {
        // Для остальных файлов показываем информацию
        console.log('[EditContractModal.handlePreviewExistingFile] Showing file info')
        Modal.info({
          title: 'Информация о файле',
          content: (
            <div>
              <p><strong>Название:</strong> {fileName}</p>
              <p><strong>Размер:</strong> {file.attachments?.size_bytes
                ? `${(file.attachments.size_bytes / 1024).toFixed(1)} KB`
                : 'Неизвестно'}</p>
              <p><strong>Тип:</strong> {file.attachments?.mime_type || 'Неизвестно'}</p>
              <p><strong>Создан:</strong> {file.attachments?.created_at
                ? dayjs(file.attachments.created_at).format('DD.MM.YYYY HH:mm')
                : 'Неизвестно'}</p>
              <Button
                type="primary"
                icon={<DownloadOutlined />}
                onClick={() => handleDownloadFile(file)}
                style={{ marginTop: 16 }}
              >
                Скачать файл
              </Button>
            </div>
          ),
          okText: 'Закрыть'
        })
      }
    } catch (error) {
      console.error('[EditContractModal.handlePreviewExistingFile] Error:', error)
      message.error('Ошибка при просмотре файла')
    }
  }

  const getBase64 = (file: RcFile): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = error => reject(error)
    })

  const beforeUpload = (file: RcFile) => {
    const isLt10M = file.size / 1024 / 1024 < 10
    if (!isLt10M) {
      message.error('Файл должен быть меньше 10MB!')
      return false
    }
    return false // Prevent automatic upload
  }

  const handleDownloadFile = async (file: any) => {
    try {
      const fileName = file.attachments?.original_name || 'file'
      const storagePath = file.attachments?.storage_path

      console.log('[EditContractModal.handleDownloadFile] Downloading file:', {
        fileName,
        storagePath
      })

      if (!storagePath) {
        message.error('Путь к файлу не найден')
        return
      }

      // Скачиваем файл через Supabase API
      const { data, error } = await supabase.storage
        .from('attachments')
        .download(storagePath)

      if (error) {
        console.error('[EditContractModal.handleDownloadFile] Download error:', error)
        throw error
      }

      // Создаем ссылку для скачивания
      const url = URL.createObjectURL(data)
      const link = document.createElement('a')
      link.href = url
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      message.success('Файл успешно скачан')
    } catch (error) {
      console.error('[EditContractModal.handleDownloadFile] Error:', error)
      message.error('Ошибка скачивания файла')
    }
  }

  const handleDeleteFile = async (file: any) => {
    try {
      // Удаляем файл из storage
      const { error: storageError } = await supabase.storage
        .from('attachments')
        .remove([file.attachments.storage_path])

      if (storageError) {
        console.error('[EditContractModal.handleDeleteFile] Storage error:', storageError)
      }

      // Удаляем запись из таблицы attachments
      const { error: attachmentError } = await supabase
        .from('attachments')
        .delete()
        .eq('id', file.attachment_id)

      if (attachmentError) throw attachmentError

      message.success('Файл успешно удален')
      loadContractFiles() // Перезагружаем список файлов
    } catch (error) {
      console.error('[EditContractModal.handleDeleteFile] Error:', error)
      message.error('Ошибка удаления файла')
    }
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      setLoading(true)

      if (!contract) return

      console.log('[EditContractModal.handleSubmit] Updating contract:', values)

      // Обновляем договор
      const { error } = await supabase
        .from('contracts')
        .update({
          contract_number: values.contractNumber,
          contract_date: values.contractDate.format('YYYY-MM-DD'),
          status_id: values.statusId,
          supplier_id: values.supplierId,
          payer_id: values.payerId,
          project_id: values.projectId,
          vat_rate: values.vatRate || 20,
          payment_terms: values.paymentTerms,
          advance_percentage: values.advancePercentage || 0,
          warranty_period_days: values.warrantyPeriodDays,
          description: values.description,
          updated_at: new Date().toISOString()
        })
        .eq('id', contract.id)

      if (error) throw error

      // Загружаем новые файлы, если есть
      if (fileList.length > 0) {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          throw new Error('Пользователь не авторизован')
        }

        for (const file of fileList) {
          if (file.originFileObj) {
            const timestamp = Date.now()
            const fileName = `${timestamp}_${file.name}`
            const filePath = `contracts/${contract.id}/${fileName}`

            // Загружаем файл в storage
            const { error: uploadError } = await supabase.storage
              .from('attachments')
              .upload(filePath, file.originFileObj)

            if (uploadError) {
              console.error('[EditContractModal.handleSubmit] Upload error:', uploadError)
              continue
            }

            // Создаём запись в таблице attachments
            const { data: attachment, error: attachmentError } = await supabase
              .from('attachments')
              .insert({
                original_name: file.name,
                storage_path: filePath,
                size_bytes: file.size || 0,
                mime_type: file.type || 'application/octet-stream',
                created_by: user.id,
                description: `Файл договора ${values.contractNumber}`
              })
              .select()
              .single()

            if (attachmentError) {
              console.error('[EditContractModal.handleSubmit] Attachment error:', attachmentError)
              continue
            }

            // Связываем файл с договором
            await supabase
              .from('contract_attachments')
              .insert({
                contract_id: contract.id,
                attachment_id: attachment.id
              })
          }
        }
      }

      message.success('Договор успешно обновлен')
      form.resetFields()
      setFileList([])
      onSuccess()
      onCancel()
    } catch (error) {
      console.error('[EditContractModal.handleSubmit] Error:', error)
      message.error('Ошибка при обновлении договора')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Modal
        title="Редактировать договор"
        open={visible}
        onCancel={onCancel}
        onOk={handleSubmit}
        confirmLoading={loading}
        okText="Сохранить"
        cancelText="Отмена"
        width={800}
      >
        <Form
          form={form}
          layout="vertical"
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="contractNumber"
                label="Номер договора"
                rules={[{ required: true, message: 'Введите номер договора' }]}
              >
                <Input placeholder="Например: 2024-001" autoComplete="off" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="contractDate"
                label="Дата договора"
                rules={[{ required: true, message: 'Выберите дату договора' }]}
              >
                <DatePicker style={{ width: '100%' }} format="DD.MM.YYYY" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="statusId"
                label="Статус договора"
                rules={[{ required: true, message: 'Выберите статус' }]}
              >
                <Select
                  placeholder="Выберите статус"
                  options={contractStatuses.map(status => ({
                    value: status.id,
                    label: (
                      <Space>
                        <Tag color={status.color || 'default'}>{status.name}</Tag>
                      </Space>
                    )
                  }))}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="vatRate"
                label="НДС (%)"
                rules={[{ required: true, message: 'Укажите ставку НДС' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  max={100}
                  placeholder="20"
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="supplierId"
                label="Поставщик"
                rules={[{ required: true, message: 'Выберите поставщика' }]}
              >
                <Select
                  placeholder="Выберите поставщика"
                  options={contractors}
                  showSearch
                  filterOption={(input, option) =>
                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="payerId"
                label="Покупатель"
                rules={[{ required: true, message: 'Выберите покупателя' }]}
              >
                <Select
                  placeholder="Выберите покупателя"
                  options={contractors}
                  showSearch
                  filterOption={(input, option) =>
                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="paymentTerms"
            label="Условия оплаты"
            rules={[{ required: true, message: 'Введите условия оплаты' }]}
          >
            <TextArea
              rows={2}
              placeholder="Например: Оплата производится в течение 10 рабочих дней после подписания акта выполненных работ"
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="advancePercentage"
                label="Процент аванса"
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  max={100}
                  placeholder="0"
                  formatter={value => `${value}%`}
                  parser={value => value!.replace('%', '') as any}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="warrantyPeriodDays"
                label="Гарантийный срок (дней)"
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  max={3650}
                  placeholder="365"
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="projectId"
                label="Проект"
              >
                <Select
                  placeholder="Выберите проект"
                  allowClear
                  showSearch
                  options={projects.map(p => ({
                    value: p.id,
                    label: p.name
                  }))}
                  filterOption={(input, option) =>
                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="description"
            label="Описание договора"
          >
            <TextArea
              rows={3}
              placeholder="Введите описание договора"
            />
          </Form.Item>

          <Form.Item label="Существующие файлы">
            {loadingFiles ? (
              <Text>Загрузка файлов...</Text>
            ) : existingFiles.length > 0 ? (
              <Space direction="vertical" style={{ width: '100%' }}>
                {existingFiles.map((file) => (
                  <div
                    key={file.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      border: '1px solid #d9d9d9',
                      borderRadius: '4px'
                    }}
                  >
                    <Space>
                      <span style={{ fontSize: 20 }}>
                        {getFileIcon(file.attachments?.original_name || '')}
                      </span>
                      <Text>{file.attachments?.original_name}</Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {file.attachments?.size_bytes
                          ? `${(file.attachments.size_bytes / 1024).toFixed(1)} KB`
                          : ''}
                      </Text>
                    </Space>
                    <Space>
                      <Tooltip title="Просмотреть">
                        <Button
                          size="small"
                          icon={<EyeOutlined />}
                          onClick={() => handlePreviewExistingFile(file)}
                        />
                      </Tooltip>
                      <Tooltip title="Скачать">
                        <Button
                          size="small"
                          icon={<DownloadOutlined />}
                          onClick={() => handleDownloadFile(file)}
                        />
                      </Tooltip>
                      <Popconfirm
                        title="Удалить файл?"
                        onConfirm={() => handleDeleteFile(file)}
                        okText="Удалить"
                        cancelText="Отмена"
                      >
                        <Button
                          size="small"
                          danger
                          icon={<DeleteOutlined />}
                        />
                      </Popconfirm>
                    </Space>
                  </div>
                ))}
              </Space>
            ) : (
              <Text type="secondary">Нет загруженных файлов</Text>
            )}
          </Form.Item>

          <Form.Item label="Добавить новые файлы">
            <Upload
              fileList={fileList}
              onPreview={handlePreview}
              onChange={({ fileList }) => setFileList(fileList)}
              beforeUpload={beforeUpload}
              multiple
            >
              <Button icon={<UploadOutlined />}>
                Загрузить файлы
              </Button>
            </Upload>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={previewOpen}
        title={`Просмотр: ${previewTitle}`}
        footer={
          previewType === 'pdf' ? (
            <Space>
              <Button
                icon={<DownloadOutlined />}
                onClick={() => {
                  // Скачиваем PDF файл
                  const link = document.createElement('a')
                  link.href = previewImage
                  link.download = previewTitle
                  document.body.appendChild(link)
                  link.click()
                  document.body.removeChild(link)
                }}
              >
                Скачать PDF
              </Button>
              <Button onClick={() => {
                setPreviewOpen(false)
                URL.revokeObjectURL(previewImage)
                setPreviewImage('')
                setPreviewTitle('')
              }}>
                Закрыть
              </Button>
            </Space>
          ) : null
        }
        onCancel={() => {
          setPreviewOpen(false)
          if (previewImage) {
            URL.revokeObjectURL(previewImage)
          }
          setPreviewImage('')
          setPreviewTitle('')
          setPreviewType('image')
        }}
        width={previewType === 'pdf' ? 1000 : 800}
        style={{ top: 20 }}
        styles={{
          body: previewType === 'pdf' ? { padding: 0, height: '75vh' } : undefined
        }}
      >
        {previewType === 'image' ? (
          <div style={{ textAlign: 'center' }}>
            <Image
              alt="preview"
              style={{ maxWidth: '100%', maxHeight: '70vh' }}
              src={previewImage}
              fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMIAAADDCAYAAADQvc6UAAABRklEQVR42u3SMQ0AAAzDsJU/6yGFfyFpIJHQK7mlL0kgCQIBgUBAICAQCAgEAgKBgEAgIBAICAQCAgGBgEAgIBAICAQCAgGBgEAgIBAICAQCAgGBgEAgIBAICAQCAgGBgEAgIBAICAQCAgGBgEAgIBAICAQCAgGBgEAgIBAICAQCAgGBgEAgIBAICAQCAgGBgEAgIBAICAQCAgGBgEAgIBAICAQCAgGBgEAgIBAICAQCAgGBgEAgIBAICAQCAgGBgEAgIBAICAQCAgGBgEAgIBAICAQCAgGBgEAgIBAICAQCAgGBgEAgIBAICAQCAgGBgEAgIBAICAQCAgGBgEAgIBAICAQCAgGBgEAgIBAICAQCAgGBgEAgIBAICAQCAgGBgEAgIBAICAQCAgGBgEAgIBAICAQCAgGBgEAgIBAICAQCAgGBgEDAJhYAAADnbvnLfwAAAABJRU5ErkJggg=="
            />
          </div>
        ) : previewType === 'pdf' ? (
          <div style={{ height: '100%', width: '100%' }}>
            <embed
              src={previewImage}
              type="application/pdf"
              width="100%"
              height="100%"
              style={{ border: 'none' }}
            />
            <div style={{
              position: 'absolute',
              bottom: 10,
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(255,255,255,0.9)',
              padding: '5px 10px',
              borderRadius: '4px'
            }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Если PDF не отображается, используйте кнопку "Скачать PDF"
              </Text>
            </div>
          </div>
        ) : null}
      </Modal>
    </>
  )
}