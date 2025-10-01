import React, { useState, useEffect, useCallback } from 'react'
import { Form, Modal, Button, Space, message, Select, Row, Col } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import type { UploadFile, UploadProps } from 'antd'
import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'
import 'dayjs/locale/ru'
import type { Contractor, Project, InvoiceType, InvoiceStatus, Invoice, UserProfile } from '../../lib/supabase'
import type { MaterialRequest } from '../../services/materialRequestOperations'
import type { Contract } from '../../services/contractOperations'
import { loadInvoiceAttachments } from './AttachmentOperations'
import { InvoiceBasicFields } from './InvoiceForm/InvoiceBasicFields'
import { InvoiceContractProjectFields } from './InvoiceForm/InvoiceContractProjectFields'
import { InvoiceContractorFieldsEnhanced } from './InvoiceForm/InvoiceContractorFieldsEnhanced'
import { InvoiceAmountFields } from './InvoiceForm/InvoiceAmountFields'
import { InvoiceFileUpload } from './InvoiceForm/InvoiceFileUpload'
import { InvoiceDeliveryFields } from './InvoiceForm/InvoiceDeliveryFields'

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
  employees: UserProfile[]
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
  materialRequests?: MaterialRequest[]
  contracts?: Contract[]
  onContractSelect?: (contractId: string | null) => void
  loadingReferences?: boolean
}

export const InvoiceFormModal: React.FC<InvoiceFormModalProps> = ({
  isVisible,
  editingInvoice,
  onClose,
  onSubmit,
  form,
  payers,
  projects,
  invoiceTypes,
  employees,
  onAmountWithVatChange,
  vatRate,
  onVatRateChange,
  amountWithoutVat,
  deliveryDays,
  onDeliveryDaysChange,
  deliveryDaysType,
  onDeliveryDaysTypeChange,
  onInvoiceDateChange,
  preliminaryDeliveryDate,
  materialRequests = [],
  contracts = [],
  onContractSelect,
  loadingReferences = false,
}) => {
  const [fileList, setFileList] = useState<UploadFile[]>([])
  const [fileDescriptions, setFileDescriptions] = useState<{ [uid: string]: string }>({})
  const [originalFiles, setOriginalFiles] = useState<UploadFile[]>([])
  const [existingAttachments, setExistingAttachments] = useState<any[]>([])
  const [uploadingFile, setUploadingFile] = useState(false)
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null)
  const [selectedContractId, setSelectedContractId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!isVisible) {
      setFileList([])
      setFileDescriptions({})
      setOriginalFiles([])
      setExistingAttachments([])
      setSelectedProjectId(null)
      setSelectedContractId(null)
      setSubmitting(false)
    } else if (editingInvoice?.id) {
      loadExistingFiles()
      // Устанавливаем выбранные значения при редактировании
      if (editingInvoice.project_id) {
        setSelectedProjectId(editingInvoice.project_id)
      }
      if (editingInvoice.contract_id) {
        setSelectedContractId(editingInvoice.contract_id)
      }
    }
  }, [isVisible, editingInvoice])

  const loadExistingFiles = async () => {
    if (!editingInvoice?.id) return

    try {
      const attachments = await loadInvoiceAttachments(editingInvoice.id)
      const existingFileList: UploadFile[] = attachments.map(att => ({
        uid: att.id,
        name: att.original_name,
        status: 'done' as const,
        url: att.storage_path,
        response: { id: att.id, storage_path: att.storage_path },
        existingAttachmentId: att.id
      } as any))

      setOriginalFiles(existingFileList)
      setExistingAttachments(attachments)

      const descriptions = attachments.reduce((acc: any, att: any) => {
        if (att.description) {
          acc[att.id] = att.description
        }
        return acc
      }, {})
      setFileDescriptions(descriptions)
    } catch (error) {
      console.error('[InvoiceFormModal.loadExistingFiles] Error:', error)
      message.error('Ошибка при загрузке файлов')
    }
  }

  const handleFileChange: UploadProps['onChange'] = ({ fileList: newFileList }) => {
    setFileList(newFileList)
  }

  const handleFileRemove: UploadProps['onRemove'] = (file) => {
    setFileList(prev => prev.filter(f => f.uid !== file.uid))
    setFileDescriptions(prev => {
      const newDescs = { ...prev }
      delete newDescs[file.uid]
      return newDescs
    })
  }

  const handleFilePreview: UploadProps['onPreview'] = async (file) => {
    if (file.url || file.response?.storage_path) {
      const url = file.url || file.response.storage_path
      window.open(url, '_blank')
    }
  }

  const handleFileUpload: UploadProps['customRequest'] = async (options) => {
    const { file, onSuccess, onError } = options
    setUploadingFile(true)

    try {
      // Simulate file upload
      setTimeout(() => {
        onSuccess?.({ id: `temp-${Date.now()}`, storage_path: URL.createObjectURL(file as Blob) })
        setUploadingFile(false)
      }, 1000)
    } catch (error) {
      onError?.(error as Error)
      setUploadingFile(false)
    }
  }

  const handleDeleteExistingFile = (fileId: string) => {
    setExistingAttachments(prev => prev.filter(att => att.id !== fileId))
    message.success('Файл удален')
  }

  const handleUpdateFileDescription = (fileId: string, description: string) => {
    setFileDescriptions(prev => ({ ...prev, [fileId]: description }))
    // Update existing attachment if it's already in database
    const existingAttachment = existingAttachments.find(att => att.id === fileId)
    if (existingAttachment) {
      existingAttachment.description = description
      // Mark the original file with the updated description
      setOriginalFiles(prev => prev.map(f =>
        f.uid === fileId
          ? { ...f, description, existingAttachmentId: fileId } as any
          : f
      ))
    }
    message.success('Описание обновлено')
  }

  const handleFinish = async (values: any) => {
    if (submitting) return // Предотвращаем повторную отправку

    setSubmitting(true)

    try {
      // Attach descriptions to files
      const filesWithDescriptions = fileList.map(file => ({
        ...file,
        description: fileDescriptions[file.uid] || ''
      }))

      const allFiles = [...originalFiles, ...filesWithDescriptions]
      const formValues = {
        ...values,
        invoice_number: values.invoice_number || 'б/н',
        invoice_date: values.invoice_date?.format('YYYY-MM-DD'),
        status_id: values.status_id || 1,
      }

      // Закрываем форму сразу
      onClose()

      // Отправляем данные
      await onSubmit(formValues, allFiles, originalFiles)
    } finally {
      setSubmitting(false)
    }
  }

  const handleAmountChange = useCallback((value: number | null) => {
    if (value !== null) {
      onAmountWithVatChange(value)
    }
  }, [onAmountWithVatChange])

  const handleVatRateChange = useCallback((value: number | null) => {
    if (value !== null) {
      onVatRateChange(value)
    }
  }, [onVatRateChange])

  const handleClearForm = () => {
    Modal.confirm({
      title: 'Очистить форму?',
      content: 'Все введенные данные будут удалены',
      okText: 'Очистить',
      cancelText: 'Отмена',
      onOk: () => {
        form.resetFields()
        setFileList([])
        setFileDescriptions({})
        setSelectedProjectId(null)
        setSelectedContractId(null)
        onAmountWithVatChange(0)
        onVatRateChange(20)
        onDeliveryDaysChange(undefined)
        onDeliveryDaysTypeChange('calendar')
        onInvoiceDateChange(dayjs())
      }
    })
  }

  // Фильтрация заявок по проекту
  const filteredMaterialRequests = materialRequests.filter(request => {
    if (!selectedProjectId) return true
    return request.project_id === selectedProjectId
  })

  return (
    <Modal
      title={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingRight: 40 }}>
          <span>{editingInvoice ? 'Редактировать счет' : 'Новый счет'}</span>
          {!editingInvoice && (
            <Button
              icon={<ReloadOutlined />}
              onClick={handleClearForm}
              size="small"
            >
              Очистить
            </Button>
          )}
        </div>
      }
      open={isVisible}
      onCancel={onClose}
      width={1100}
      footer={null}
      destroyOnHidden
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleFinish}
        preserve={false}
      >
        {/* Basic Fields */}
        <InvoiceBasicFields
          invoiceTypes={invoiceTypes}
          onInvoiceDateChange={onInvoiceDateChange}
          form={form}
        />

        {/* Project and Contract Fields with Dependencies */}
        <InvoiceContractProjectFields
          contracts={contracts || []}
          projects={projects}
          form={form}
          onContractSelect={(contractId) => {
            setSelectedContractId(contractId)
            if (onContractSelect) onContractSelect(contractId)
          }}
          onProjectSelect={(projectId) => {
            setSelectedProjectId(projectId)
          }}
        />

        {/* Contractor Fields with Filtering */}
        <InvoiceContractorFieldsEnhanced
          contractors={payers}
          employees={employees}
          form={form}
          isNewInvoice={!editingInvoice}
          selectedProjectId={selectedProjectId}
          selectedContractId={selectedContractId}
          contracts={contracts || []}
        />

        {/* Material Request Field */}
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="material_request_id"
              label={
                <span>
                  Заявка на материалы
                  {selectedProjectId && filteredMaterialRequests.length < materialRequests.length && (
                    <span style={{ marginLeft: 8, fontSize: '12px', color: '#999' }}>
                      (отфильтровано по проекту: {filteredMaterialRequests.length} из {materialRequests.length})
                    </span>
                  )}
                </span>
              }
            >
              <Select
                placeholder="Выберите заявку на материалы"
                allowClear
                showSearch
                optionFilterProp="label"
                options={filteredMaterialRequests.map((request) => ({
                  value: request.id,
                  label: `${request.request_number} от ${request.request_date ?
                    new Date(request.request_date).toLocaleDateString('ru-RU') : 'без даты'}`,
                }))}
                onChange={(value) => {
                  // Если выбрана заявка, автоматически устанавливаем проект из нее
                  if (value) {
                    const selectedRequest = materialRequests.find(r => r.id === value)
                    if (selectedRequest?.project_id && !selectedProjectId) {
                      form.setFieldValue('project_id', selectedRequest.project_id)
                      setSelectedProjectId(selectedRequest.project_id)
                    }
                  }
                }}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            {/* Пустая колонка для баланса */}
          </Col>
        </Row>

        {/* Amount Fields */}
        <InvoiceAmountFields
          vatRate={vatRate}
          amountWithoutVat={amountWithoutVat}
          onAmountChange={handleAmountChange}
          onVatRateChange={handleVatRateChange}
          form={form}
        />

        {/* Delivery Fields */}
        <InvoiceDeliveryFields
          deliveryDays={deliveryDays}
          deliveryDaysType={deliveryDaysType}
          preliminaryDeliveryDate={preliminaryDeliveryDate}
          onDeliveryDaysChange={onDeliveryDaysChange}
          onDeliveryDaysTypeChange={onDeliveryDaysTypeChange}
        />

        {/* Comments Field */}

        {/* File Upload */}
        <InvoiceFileUpload
          fileList={fileList}
          onFileChange={handleFileChange}
          onFileRemove={handleFileRemove}
          onFilePreview={handleFilePreview}
          customRequest={handleFileUpload}
          uploadingFile={uploadingFile}
          existingAttachments={existingAttachments}
          onDeleteExistingFile={handleDeleteExistingFile}
          onUpdateFileDescription={handleUpdateFileDescription}
          fileDescriptions={fileDescriptions}
        />

        <Form.Item>
          <Space>
            <Button
              type="primary"
              htmlType="submit"
              loading={submitting}
              disabled={submitting}
            >
              {editingInvoice ? 'Сохранить' : 'Создать'}
            </Button>
            <Button onClick={onClose} disabled={submitting}>
              Отмена
            </Button>
            {loadingReferences && (
              <Button icon={<ReloadOutlined spin />} disabled>
                Загрузка данных...
              </Button>
            )}
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  )
}