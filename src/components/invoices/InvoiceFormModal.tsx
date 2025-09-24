import { Form, Modal, Input, InputNumber, Select, DatePicker, Radio, Row, Col, Space, Button, Upload, message, Table } from 'antd'
import { useState, useEffect } from 'react'
import { UploadOutlined, EyeOutlined, DeleteOutlined, ReloadOutlined } from '@ant-design/icons'
import type { UploadFile, UploadProps } from 'antd/es/upload/interface'
import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'
import 'dayjs/locale/ru'
import type { Contractor, Project, InvoiceType, InvoiceStatus, Invoice } from '../../lib/supabase'
import { loadInvoiceAttachments } from './AttachmentOperations'
import type { Employee } from '../../services/employeeOperations'

// Принудительно активируем русскую локаль для dayjs
dayjs.locale('ru')

interface InvoiceFormModalProps {
  isVisible: boolean
  editingInvoice?: Invoice | null
  onClose: () => void
  onSubmit: (values: any, files: UploadFile[], originalFiles?: UploadFile[]) => void
  form: any
  payers: Contractor[]
  suppliers: Contractor[]
  projects: Project[]
  invoiceTypes: InvoiceType[]
  invoiceStatuses: InvoiceStatus[]
  employees: Employee[]
  amountWithVat: number
  onAmountWithVatChange: (value: number) => void
  vatRate: number
  onVatRateChange: (value: number) => void
  vatAmount: number
  amountWithoutVat: number
  deliveryDays: number | undefined
  onDeliveryDaysChange: (value: number | undefined) => void
  deliveryDaysType: 'working' | 'calendar'
  onDeliveryDaysTypeChange: (value: 'working' | 'calendar') => void
  invoiceDate: Dayjs
  onInvoiceDateChange: (date: Dayjs) => void
  preliminaryDeliveryDate: Dayjs | null
  formatAmount: (value: number | string | undefined) => string
  parseAmount: (value: string | undefined) => number
}

export const InvoiceFormModal: React.FC<InvoiceFormModalProps> = ({
  isVisible,
  editingInvoice,
  onClose,
  onSubmit,
  form,
  payers,
  suppliers,
  projects,
  invoiceTypes,
  invoiceStatuses,
  employees,
  amountWithVat,
  onAmountWithVatChange,
  vatRate: currentVatRate,
  onVatRateChange,
  vatAmount,
  amountWithoutVat,
  deliveryDays: currentDeliveryDays,
  onDeliveryDaysChange,
  deliveryDaysType: currentDeliveryDaysType,
  onDeliveryDaysTypeChange,
  invoiceDate: currentInvoiceDate,
  onInvoiceDateChange,
  preliminaryDeliveryDate,
  formatAmount,
  parseAmount,
}) => {
  const [fileList, setFileList] = useState<UploadFile[]>([])
  const [fileDescriptions, setFileDescriptions] = useState<{ [uid: string]: string }>({})
  const [previewFile, setPreviewFile] = useState<{ url: string; name: string; type: string } | null>(null)
  const [loadingFiles, setLoadingFiles] = useState(false)
  const [originalFiles, setOriginalFiles] = useState<UploadFile[]>([]) // Для отслеживания удаленных файлов

  useEffect(() => {
    if (!isVisible) {
      setFileList([])
      setFileDescriptions({})
      setOriginalFiles([])
    } else if (editingInvoice?.id) {
      // Загружаем существующие файлы при редактировании счета
      loadExistingFiles()
    }
  }, [isVisible, editingInvoice])

  // Функция загрузки существующих файлов счета
  const loadExistingFiles = async () => {
    if (!editingInvoice?.id) return

    setLoadingFiles(true)

    try {
      const attachments = await loadInvoiceAttachments(editingInvoice.id)

      // Фильтруем только файлы счета (не файлы платежей)
      const invoiceAttachments = attachments.filter(a => a.source === 'invoice' || !a.source)

      // Преобразуем загруженные файлы в формат UploadFile
      const existingFiles: UploadFile[] = invoiceAttachments.map(attachment => ({
        uid: attachment.id,
        name: attachment.original_name,
        size: attachment.size_bytes,
        type: attachment.mime_type,
        status: 'done' as const,
        existingAttachmentId: attachment.id,
        url: `${import.meta.env.VITE_STORAGE_BUCKET}/object/public/attachments/${attachment.storage_path}`
      }))

      // Создаем объект с описаниями
      const descriptions: { [uid: string]: string } = {}
      invoiceAttachments.forEach(attachment => {
        if (attachment.description) {
          descriptions[attachment.id] = attachment.description
        }
      })

      setFileList(existingFiles)
      setFileDescriptions(descriptions)
      setOriginalFiles(existingFiles) // Сохраняем оригинальный список файлов

    } catch (error) {
      console.error('[InvoiceFormModal.loadExistingFiles] Error loading files:', error)
      message.error('Ошибка загрузки существующих файлов')
    } finally {
      setLoadingFiles(false)
    }
  }

  useEffect(() => {
    if (isVisible) {
      form.setFieldsValue({
        invoice_date: currentInvoiceDate,
        vat_rate: currentVatRate,
        delivery_days: currentDeliveryDays,
        delivery_days_type: currentDeliveryDaysType,
      })
    }
  }, [isVisible, currentInvoiceDate, currentVatRate, currentDeliveryDays, currentDeliveryDaysType, form])

  const handlePreview = async (file: UploadFile) => {
    if (!file.originFileObj && !file.url) {
      message.error('Файл недоступен для просмотра')
      return
    }

    let previewUrl: string = ''

    if (file.url) {
      previewUrl = file.url
    } else if (file.originFileObj) {
      // Создаем URL для локального файла
      previewUrl = URL.createObjectURL(file.originFileObj as File)
    }

    // Проверяем тип файла
    const fileType = file.type || file.originFileObj?.type || ''
    const fileName = file.name || 'Файл'

    // Если это изображение или PDF, показываем в модальном окне
    if (fileType.startsWith('image/')) {
      setPreviewFile({ url: previewUrl, name: fileName, type: 'image' })
    } else if (fileType === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf')) {
      setPreviewFile({ url: previewUrl, name: fileName, type: 'pdf' })
    } else {
      // Для других типов файлов открываем в новом окне
      const newWindow = window.open(previewUrl, '_blank')
      if (!newWindow) {
        message.error('Не удалось открыть файл. Проверьте настройки блокировки всплывающих окон.')
      }
    }
  }

  const uploadProps: UploadProps = {
    multiple: true,
    fileList,
    showUploadList: false, // Отключаем стандартный список, так как используем таблицу
    onPreview: handlePreview,
    beforeUpload: (file) => {
      const isLt10Mb = file.size / 1024 / 1024 < 10
      if (!isLt10Mb) {
        message.error(`${file.name} не должен превышать 10 МБ`)
        return Upload.LIST_IGNORE
      }

      // Создаем объект UploadFile с правильной структурой
      const uploadFile: UploadFile = {
        uid: file.uid || `-${Date.now()}`,
        name: file.name,
        size: file.size,
        type: file.type,
        originFileObj: file as any,
        status: 'done',
      }

      setFileList((prev) => [...prev, uploadFile])
      // Инициализируем пустое описание для нового файла
      setFileDescriptions((prev) => ({ ...prev, [uploadFile.uid]: '' }))
      return false
    },
    onRemove: (file) => {
      setFileList((prev) => prev.filter((item) => item.uid !== file.uid))
      // Удаляем описание для удаленного файла
      setFileDescriptions((prev) => {
        const newDescriptions = { ...prev }
        delete newDescriptions[file.uid]
        return newDescriptions
      })
    },
  }

  const handleSubmit = (values: any) => {
    // Добавляем описания к файлам
    const filesWithDescriptions = fileList.map(file => ({
      ...file,
      description: fileDescriptions[file.uid] || ''
    }))

    // Передаем оригинальные файлы если это редактирование
    const originalFilesWithDescriptions = editingInvoice ? originalFiles : []

    onSubmit(values, filesWithDescriptions, originalFilesWithDescriptions)
  }

  return (
    <>
      <Modal
        title={editingInvoice ? "Редактировать счёт" : "Создать счёт"}
        open={isVisible}
        onCancel={onClose}
        footer={null}
        width={800}
      >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
      >
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="invoice_number"
              label="Номер счёта"
            >
              <Input placeholder="б/н (если номер отсутствует)" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="invoice_date"
              label="Дата счёта"
              rules={[{ required: true, message: 'Укажите дату счёта' }]}
            >
              <DatePicker
                style={{ width: '100%' }}
                format="DD.MM.YYYY"
                onChange={(date) => onInvoiceDateChange(date || dayjs())}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="payer_id"
              label="Плательщик"
              rules={[{ required: true, message: 'Выберите плательщика' }]}
            >
              <Select
                placeholder="Выберите плательщика"
                showSearch
                optionFilterProp="label"
                options={payers.map((payer) => ({
                  value: payer.id,
                  label: payer.name,
                }))}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="supplier_id"
              label="Поставщик"
              rules={[{ required: true, message: 'Выберите поставщика' }]}
            >
              <Select
                placeholder="Выберите поставщика"
                showSearch
                optionFilterProp="label"
                options={suppliers.map((supplier) => ({
                  value: supplier.id,
                  label: supplier.name,
                }))}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="project_id"
              label="Проект"
              rules={[{ required: true, message: 'Выберите проект' }]}
            >
              <Select
                placeholder="Выберите проект"
                showSearch
                optionFilterProp="label"
                options={projects.map((project) => ({
                  value: project.id,
                  label: project.name,
                }))}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="invoice_type_id"
              label="Тип счёта"
              rules={[{ required: true, message: 'Выберите тип счёта' }]}
            >
              <Select
                placeholder="Выберите тип счёта"
                showSearch
                optionFilterProp="label"
                options={invoiceTypes.map((type) => ({
                  value: type.id,
                  label: type.name,
                }))}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="employee_id"
              label="Ответственный сотрудник"
            >
              <Select
                placeholder="Выберите сотрудника"
                showSearch
                optionFilterProp="label"
                allowClear
                options={employees
                  .filter(emp => emp.is_active)
                  .map((employee) => ({
                    value: employee.id,
                    label: employee.full_name || `${employee.last_name} ${employee.first_name}`,
                  }))}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            {/* Empty column for layout balance */}
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={8}>
            <Form.Item label="Сумма счёта с НДС" required>
              <InputNumber
                style={{ width: '100%' }}
                value={amountWithVat}
                onChange={(value) => onAmountWithVatChange(Number(value) || 0)}
                placeholder="0,00"
                min={0}
                precision={2}
                decimalSeparator="," 
                formatter={(value) => {
                  if (value === undefined || value === null || value === '') {
                    return '0,00'
                  }
                  const numeric = typeof value === 'number' ? value : Number(value.toString().replace(/\s/g, '').replace(',', '.'))
                  if (Number.isNaN(numeric)) {
                    return '0,00'
                  }
                  return numeric
                    .toFixed(2)
                    .replace('.', ',')
                    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
                }}
                parser={(value) => parseAmount(value || '0')}
                addonAfter="₽"
              />
            </Form.Item>
          </Col>
          <Col span={4}>
            <Form.Item
              name="vat_rate"
              label="НДС"
              rules={[{ required: true, message: 'Выберите ставку НДС' }]}
            >
              <Select onChange={onVatRateChange}>
                <Select.Option value={0}>0%</Select.Option>
                <Select.Option value={3}>3%</Select.Option>
                <Select.Option value={5}>5%</Select.Option>
                <Select.Option value={7}>7%</Select.Option>
                <Select.Option value={20}>20%</Select.Option>
                <Select.Option value={22}>22%</Select.Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item label="Сумма НДС">
              <Input
                value={formatAmount(vatAmount)}
                disabled
                suffix="₽"
                style={{ backgroundColor: '#f5f5f5' }}
              />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item label="Сумма без НДС">
              <Input
                value={formatAmount(amountWithoutVat)}
                disabled
                suffix="₽"
                style={{ backgroundColor: '#f5f5f5' }}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={6}>
            <Form.Item
              name="delivery_days"
              label="Срок поставки (дней)"
            >
              <InputNumber
                style={{ width: '100%' }}
                min={0}
                onChange={(value) => onDeliveryDaysChange(value === null ? undefined : Number(value))}
              />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item
              name="delivery_days_type"
              label="Тип дней"
            >
              <Radio.Group onChange={(event) => onDeliveryDaysTypeChange(event.target.value)}>
                <Radio value="working">Рабочие</Radio>
                <Radio value="calendar">Календарные</Radio>
              </Radio.Group>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Расчётная дата поставки">
              <Input
                value={preliminaryDeliveryDate
                  ? `${preliminaryDeliveryDate.format('DD.MM.YYYY')} (${preliminaryDeliveryDate.format('dddd')})`
                  : 'Дата поставки ещё не рассчитана'}
                disabled
                style={{
                  backgroundColor: '#f5f5f5',
                  fontWeight: preliminaryDeliveryDate ? 'bold' : 'normal',
                }}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={8}>
            <Form.Item
              name="delivery_cost"
              label="Стоимость доставки"
            >
              <InputNumber
                style={{ width: '100%' }}
                min={0}
                precision={2}
                decimalSeparator=","
                placeholder="0,00"
                formatter={(value) => {
                  if (value === undefined || value === null || value === '') {
                    return ''
                  }
                  const numeric = typeof value === 'number' ? value : Number(value.toString().replace(/\s/g, '').replace(',', '.'))
                  if (Number.isNaN(numeric)) {
                    return ''
                  }
                  return numeric
                    .toFixed(2)
                    .replace('.', ',')
                    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
                }}
                parser={(value) => {
                  if (!value) return 0
                  return Number(value.replace(/\s/g, '').replace(',', '.'))
                }}
                addonAfter="₽"
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          name="description"
          label="Описание"
        >
          <Input.TextArea rows={3} />
        </Form.Item>

        <Form.Item label="Прикреплённые файлы">
          <Upload {...uploadProps}>
            <Button icon={<UploadOutlined />}>Выбрать файлы</Button>
          </Upload>
          {(fileList.length > 0 || loadingFiles) && (
            <Table
              style={{ marginTop: 16 }}
              loading={loadingFiles}
              dataSource={fileList}
              rowKey="uid"
              pagination={false}
              size="small"
              columns={[
                {
                  title: 'Файл',
                  dataIndex: 'name',
                  key: 'name',
                  width: '40%',
                  render: (name: string) => (
                    <Space size="small">
                      <EyeOutlined
                        style={{ color: '#1890ff', cursor: 'pointer' }}
                        onClick={() => {
                          const file = fileList.find(f => f.name === name)
                          if (file) {
                            handlePreview(file)
                          }
                        }}
                        title="Просмотр"
                      />
                      <DeleteOutlined
                        style={{ color: '#ff4d4f', cursor: 'pointer' }}
                        onClick={() => {
                          const file = fileList.find(f => f.name === name)
                          if (file) {
                            uploadProps.onRemove?.(file)
                          }
                        }}
                        title="Удалить"
                      />
                      <span>{name}</span>
                    </Space>
                  )
                },
                {
                  title: 'Размер',
                  dataIndex: 'size',
                  key: 'size',
                  width: '15%',
                  render: (size: number) => {
                    const kb = size / 1024
                    return kb < 1024
                      ? `${kb.toFixed(1)} КБ`
                      : `${(kb / 1024).toFixed(1)} МБ`
                  }
                },
                {
                  title: 'Описание',
                  key: 'description',
                  render: (_, file) => (
                    <Input
                      placeholder="Введите описание файла (необязательно)"
                      value={fileDescriptions[file.uid] || ''}
                      onChange={(e) =>
                        setFileDescriptions((prev) => ({
                          ...prev,
                          [file.uid]: e.target.value,
                        }))
                      }
                      size="small"
                    />
                  )
                }
              ]}
            />
          )}
        </Form.Item>

        {/* Кнопка обновления даты актуальности - только для редактирования */}
        {editingInvoice && (
          <Form.Item label="Дата актуальности счета" style={{ marginBottom: 16 }}>
            <Space>
              <Input
                value={form.getFieldValue('relevance_date')
                  ? dayjs(form.getFieldValue('relevance_date')).format('DD.MM.YYYY HH:mm')
                  : 'Не установлена'}
                disabled
                style={{ width: 200 }}
              />
              <Button
                icon={<ReloadOutlined />}
                onClick={() => {
                  const now = dayjs().toISOString()
                  form.setFieldsValue({ relevance_date: now })
                  message.success('Дата актуальности обновлена')
                }}
              >
                Обновить дату актуальности
              </Button>
            </Space>
          </Form.Item>
        )}

        <Form.Item name="relevance_date" hidden>
          <Input />
        </Form.Item>

        <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
          <Space>
            <Button onClick={onClose}>Отмена</Button>
            <Button type="primary" htmlType="submit">
              {editingInvoice ? 'Сохранить' : 'Создать'}
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>

    {/* Модальное окно для предпросмотра файлов */}
    <Modal
      open={!!previewFile}
      title={previewFile?.name}
      footer={null}
      onCancel={() => {
        // Очищаем URL объекта при закрытии для освобождения памяти
        if (previewFile?.url.startsWith('blob:')) {
          URL.revokeObjectURL(previewFile.url)
        }
        setPreviewFile(null)
      }}
      width={900}
      centered
      styles={{ body: { padding: 0 } }}
    >
      {previewFile && (
        <>
          {previewFile.type === 'image' ? (
            <img
              src={previewFile.url}
              alt={previewFile.name}
              style={{
                width: '100%',
                maxHeight: '70vh',
                objectFit: 'contain',
                padding: '20px'
              }}
            />
          ) : previewFile.type === 'pdf' ? (
            <iframe
              src={previewFile.url}
              title={previewFile.name}
              style={{
                width: '100%',
                height: '70vh',
                border: 'none'
              }}
            />
          ) : null}
        </>
      )}
    </Modal>
    </>
  )
}