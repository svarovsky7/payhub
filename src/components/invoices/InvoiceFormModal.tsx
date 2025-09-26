import React, { useState, useEffect, useCallback } from 'react'
import { Form, Modal, Button, Space, message } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import type { UploadFile, UploadProps } from 'antd'
import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'
import 'dayjs/locale/ru'
import type { Contractor, Project, InvoiceType, InvoiceStatus, Invoice } from '../../lib/supabase'
import type { Employee } from '../../services/employeeOperations'
import type { MaterialRequest } from '../../services/materialRequestOperations'
import type { Contract } from '../../services/contractOperations'
import { loadInvoiceAttachments } from './AttachmentOperations'
import { InvoiceBasicFields } from './InvoiceForm/InvoiceBasicFields'
import { InvoiceReferenceFields } from './InvoiceForm/InvoiceReferenceFields'
import { InvoiceContractorFields } from './InvoiceForm/InvoiceContractorFields'
import { InvoiceAmountFields } from './InvoiceForm/InvoiceAmountFields'
import { InvoiceFileUpload } from './InvoiceForm/InvoiceFileUpload'
import { InvoiceDeliveryFields } from './InvoiceForm/InvoiceDeliveryFields'
import { InvoiceCommentsField } from './InvoiceForm/InvoiceCommentsField'
import { InvoiceStatusField } from './InvoiceForm/InvoiceStatusField'

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
  suppliers,
  projects,
  invoiceTypes,
  invoiceStatuses,
  employees,
  amountWithVat,
  onAmountWithVatChange,
  vatRate,
  onVatRateChange,
  vatAmount,
  amountWithoutVat,
  deliveryDays,
  onDeliveryDaysChange,
  deliveryDaysType,
  onDeliveryDaysTypeChange,
  invoiceDate,
  onInvoiceDateChange,
  preliminaryDeliveryDate,
  formatAmount,
  parseAmount,
  materialRequests = [],
  contracts = [],
  onContractSelect,
  loadingReferences = false,
}) => {
  const [fileList, setFileList] = useState<UploadFile[]>([])
  const [fileDescriptions, setFileDescriptions] = useState<{ [uid: string]: string }>({})
  const [loadingFiles, setLoadingFiles] = useState(false)
  const [originalFiles, setOriginalFiles] = useState<UploadFile[]>([])
  const [existingAttachments, setExistingAttachments] = useState<any[]>([])
  const [uploadingFile, setUploadingFile] = useState(false)

  useEffect(() => {
    if (!isVisible) {
      setFileList([])
      setFileDescriptions({})
      setOriginalFiles([])
      setExistingAttachments([])
    } else if (editingInvoice?.id) {
      loadExistingFiles()
    }
  }, [isVisible, editingInvoice])

  const loadExistingFiles = async () => {
    if (!editingInvoice?.id) return

    setLoadingFiles(true)
    try {
      const attachments = await loadInvoiceAttachments(editingInvoice.id)
      const existingFileList: UploadFile[] = attachments.map(att => ({
        uid: att.id,
        name: att.original_name,
        status: 'done' as const,
        url: att.storage_path,
        response: { id: att.id, storage_path: att.storage_path }
      }))

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
    } finally {
      setLoadingFiles(false)
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

  const handleDeleteExistingFile = (fileId: string, filePath: string) => {
    setExistingAttachments(prev => prev.filter(att => att.id !== fileId))
    message.success('Файл удален')
  }

  const handleUpdateFileDescription = (fileId: string, description: string) => {
    setFileDescriptions(prev => ({ ...prev, [fileId]: description }))
    message.success('Описание обновлено')
  }

  const handleFinish = (values: any) => {
    const allFiles = [...originalFiles, ...fileList]
    const formValues = {
      ...values,
      file_descriptions: fileDescriptions,
      invoice_date: values.invoice_date?.format('YYYY-MM-DD'),
      payment_deadline_date: values.payment_deadline_date?.format('YYYY-MM-DD'),
      status_id: values.status_id || 1,
    }

    onSubmit(formValues, allFiles, originalFiles)
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

  return (
    <Modal
      title={editingInvoice ? 'Редактировать счет' : 'Новый счет'}
      open={isVisible}
      onCancel={onClose}
      width={900}
      footer={null}
      destroyOnClose
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
        />

        {/* Reference Fields */}
        <InvoiceReferenceFields
          contracts={contracts}
          materialRequests={materialRequests}
          onContractSelect={onContractSelect || (() => {})}
        />

        {/* Contractor Fields */}
        <InvoiceContractorFields
          contractors={[...payers, ...suppliers]}
          projects={projects}
          employees={employees}
        />

        {/* Amount Fields */}
        <InvoiceAmountFields
          vatRate={vatRate}
          amountWithoutVat={amountWithoutVat}
          onAmountChange={handleAmountChange}
          onVatRateChange={handleVatRateChange}
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
        <InvoiceCommentsField />

        {/* Status Field (only for editing) */}
        {editingInvoice && (
          <InvoiceStatusField invoiceStatuses={invoiceStatuses} />
        )}

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
        />

        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit">
              {editingInvoice ? 'Сохранить' : 'Создать'}
            </Button>
            <Button onClick={onClose}>
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