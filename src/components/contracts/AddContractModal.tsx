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
  Tag
} from 'antd'
import {
  UploadOutlined,
  EyeOutlined,
  DeleteOutlined,
  FileTextOutlined,
  FilePdfOutlined,
  FileImageOutlined,
  FileExcelOutlined,
  FileWordOutlined
} from '@ant-design/icons'
import dayjs from 'dayjs'
import type { UploadFile, RcFile } from 'antd/es/upload'
import { supabase } from '../../lib/supabase'
import { loadContractors, loadContractStatuses } from '../../services/contractOperations'

const { TextArea } = Input
const { Text } = Typography

interface AddContractModalProps {
  visible: boolean
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

export const AddContractModal: React.FC<AddContractModalProps> = ({
  visible,
  onCancel,
  onSuccess
}) => {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [contractors, setContractors] = useState<ContractorOption[]>([])
  const [contractStatuses, setContractStatuses] = useState<ContractStatus[]>([])
  const [fileList, setFileList] = useState<UploadFile[]>([])
  const [previewImage, setPreviewImage] = useState<string>('')
  const [previewOpen, setPreviewOpen] = useState(false)

  useEffect(() => {
    if (visible) {
      loadInitialData()
    }
  }, [visible])

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

      // Устанавливаем статус по умолчанию
      const draftStatus = statusesData.find(s => s.code === 'draft')
      if (draftStatus) {
        form.setFieldsValue({ statusId: draftStatus.id })
      }
    } catch (error) {
      console.error('[AddContractModal.loadInitialData] Error:', error)
      message.error('Ошибка загрузки данных')
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
        setPreviewOpen(true)
      }
    } else {
      setPreviewImage(file.url || file.preview || '')
      setPreviewOpen(true)
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

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      setLoading(true)

      console.log('[AddContractModal.handleSubmit] Creating contract:', values)

      // Получаем текущего пользователя
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('Пользователь не авторизован')
      }

      // Создаём договор
      const { data: contract, error } = await supabase
        .from('contracts')
        .insert({
          contract_number: values.contractNumber,
          contract_date: values.contractDate.format('YYYY-MM-DD'),
          status_id: values.statusId,
          supplier_id: values.supplierId,
          payer_id: values.payerId,
          vat_rate: values.vatRate || 20,
          payment_terms: values.paymentTerms,
          advance_percentage: values.advancePercentage || 0,
          description: values.description,
          created_by: user.id
        })
        .select()
        .single()

      if (error) throw error

      // Загружаем файлы, если есть
      if (fileList.length > 0) {
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
              console.error('[AddContractModal.handleSubmit] Upload error:', uploadError)
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
              console.error('[AddContractModal.handleSubmit] Attachment error:', attachmentError)
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

      message.success('Договор успешно создан')
      form.resetFields()
      setFileList([])
      onSuccess()
      onCancel()
    } catch (error) {
      console.error('[AddContractModal.handleSubmit] Error:', error)
      message.error('Ошибка при создании договора')
    } finally {
      setLoading(false)
    }
  }

  const uploadButton = (
    <Button icon={<UploadOutlined />}>
      Загрузить файлы
    </Button>
  )

  return (
    <>
      <Modal
        title="Добавить договор"
        open={visible}
        onCancel={onCancel}
        onOk={handleSubmit}
        confirmLoading={loading}
        okText="Создать"
        cancelText="Отмена"
        width={800}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            vatRate: 20,
            contractDate: dayjs()
          }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="contractNumber"
                label="Номер договора"
                rules={[{ required: true, message: 'Введите номер договора' }]}
              >
                <Input placeholder="Например: 2024-001" />
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

          <Form.Item label="Файлы договора">
            <Upload
              listType="picture-card"
              fileList={fileList}
              onPreview={handlePreview}
              onChange={({ fileList }) => setFileList(fileList)}
              beforeUpload={beforeUpload}
              multiple
              itemRender={(originNode, file) => (
                <div style={{ position: 'relative' }}>
                  <div style={{
                    padding: '8px',
                    textAlign: 'center',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center'
                  }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>
                      {getFileIcon(file.name)}
                    </div>
                    <Text ellipsis style={{ maxWidth: '80px', fontSize: 11 }}>
                      {file.name}
                    </Text>
                  </div>
                  <Space style={{ position: 'absolute', top: 4, right: 4 }}>
                    <Button
                      size="small"
                      icon={<EyeOutlined />}
                      onClick={(e) => {
                        e.stopPropagation()
                        handlePreview(file)
                      }}
                    />
                    <Button
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={(e) => {
                        e.stopPropagation()
                        setFileList(fileList.filter(f => f.uid !== file.uid))
                      }}
                    />
                  </Space>
                </div>
              )}
            >
              {fileList.length >= 8 ? null : uploadButton}
            </Upload>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={previewOpen}
        title="Просмотр файла"
        footer={null}
        onCancel={() => setPreviewOpen(false)}
      >
        <Image
          alt="preview"
          style={{ width: '100%' }}
          src={previewImage}
          fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMIAAADDCAYAAADQvc6UAAABRklEQVR42u3SMQ0AAAzDsJU/6yGFfyFpIJHQK7mlL0kgCQIBgUBAICAQCAgEAgKBgEAgIBAICAQCAgGBgEAgIBAICAQCAgGBgEAgIBAICAQCAgGBgEAgIBAICAQCAgGBgEAgIBAICAQCAgGBgEAgIBAICAQCAgGBgEAgIBAICAQCAgGBgEAgIBAICAQCAgGBgEAgIBAICAQCAgGBgEAgIBAICAQCAgGBgEAgIBAICAQCAgGBgEAgIBAICAQCAgGBgEAgIBAICAQCAgGBgEAgIBAICAQCAgGBgEAgIBAICAQCAgGBgEAgIBAICAQCAgGBgEAgIBAICAQCAgGBgEAgIBAICAQCAgGBgEAgIBAICAQCAgGBgEAgIBAICAQCAgGBgEAgIBAICAQCAgGBgEAgIBAICAQCAgGBgEAgIBAICAQCAgGBgEDAJhYAAADnbvnLfwAAAABJRU5ErkJggg=="
        />
      </Modal>
    </>
  )
}