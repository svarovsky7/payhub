import React, { useState, useEffect, useCallback } from 'react'
import { Form, Modal, Button, Space, message, Select, Row, Col } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import type { UploadFile } from 'antd'
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
import { InvoiceDeliveryFields } from './InvoiceForm/InvoiceDeliveryFields'
import { FileUploadBlock, type ExistingFile, type FileDescriptions } from '../common/FileUploadBlock'

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
  onSaveAsDraft?: (values: any, files: UploadFile[], originalFiles?: UploadFile[]) => void
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
  onSaveAsDraft,
}) => {
  const [fileList, setFileList] = useState<UploadFile[]>([])
  const [fileDescriptions, setFileDescriptions] = useState<FileDescriptions>({})
  const [originalFiles, setOriginalFiles] = useState<UploadFile[]>([])
  const [existingFiles, setExistingFiles] = useState<ExistingFile[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null)
  const [selectedContractId, setSelectedContractId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!isVisible) {
      setFileList([])
      setFileDescriptions({})
      setOriginalFiles([])
      setExistingFiles([])
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

      // Convert attachments to ExistingFile format
      const existingFilesList: ExistingFile[] = attachments.map(att => ({
        id: att.id,
        original_name: att.original_name,
        storage_path: att.storage_path,
        size_bytes: att.size_bytes || 0,
        mime_type: att.mime_type || 'application/octet-stream',
        description: att.description,
        created_at: att.created_at,
        attachment_id: att.id
      }))

      setExistingFiles(existingFilesList)

      const descriptions = attachments.reduce((acc: FileDescriptions, att: any) => {
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

  const handleFileListChange = (newFileList: UploadFile[]) => {
    setFileList(newFileList)
  }

  const handleFileDescriptionChange = (uid: string, description: string) => {
    setFileDescriptions(prev => ({ ...prev, [uid]: description }))
  }

  const handleExistingFileDescriptionChange = (fileId: string, description: string) => {
    setExistingFiles(prev =>
      prev.map(file =>
        file.id === fileId ? { ...file, description } : file
      )
    )
  }

  const handleExistingFilesChange = async () => {
    // Reload existing files after changes
    if (editingInvoice?.id) {
      await loadExistingFiles()
    }
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

  const handleSaveAsDraft = async () => {
    if (submitting || !onSaveAsDraft) return

    setSubmitting(true)

    try {
      // Attach descriptions to files
      const filesWithDescriptions = fileList.map(file => ({
        ...file,
        description: fileDescriptions[file.uid] || ''
      }))

      const allFiles = [...originalFiles, ...filesWithDescriptions]
      const invoiceDateValue = form.getFieldValue('invoice_date')
      const formValues = {
        ...form.getFieldsValue(),
        invoice_number: form.getFieldValue('invoice_number') || 'б/н',
        invoice_date: invoiceDateValue ? invoiceDateValue.format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
        status_id: 6 // not_filled status
      }

      // Закрываем форму сразу
      onClose()

      // Отправляем данные
      await onSaveAsDraft(formValues, allFiles, originalFiles)
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
      width={1300}
      footer={null}
      destroyOnHidden
      maskClosable={false}
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
        <Form.Item label="Файлы счета">
          <FileUploadBlock
            entityType="invoice"
            entityId={editingInvoice?.id}
            fileList={fileList}
            onFileListChange={handleFileListChange}
            existingFiles={existingFiles}
            onExistingFilesChange={handleExistingFilesChange}
            fileDescriptions={fileDescriptions}
            onFileDescriptionChange={handleFileDescriptionChange}
            onExistingFileDescriptionChange={handleExistingFileDescriptionChange}
            multiple={true}
            maxSize={50}
            disabled={submitting}
          />
        </Form.Item>

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
            {!editingInvoice && onSaveAsDraft && (
              <Button
                onClick={handleSaveAsDraft}
                loading={submitting}
                disabled={submitting}
              >
                Сохранить как черновик
              </Button>
            )}
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