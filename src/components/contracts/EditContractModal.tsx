import React, { useState, useEffect } from 'react'
import { Modal, Form, message } from 'antd'
import dayjs from 'dayjs'
import { supabase } from '../../lib/supabase'
import {
  loadContractors,
  loadContractStatuses,
  loadProjects,
  type Contract
} from '../../services/contractOperations'
import { ContractFormFields } from './EditContract/ContractFormFields'
import { FileUploadBlock } from '../common/FileUploadBlock'
import { useFileAttachment } from '../../hooks/useFileAttachment'

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

  // Используем хук для управления файлами
  const {
    fileList,
    existingFiles,
    fileDescriptions,
    uploading,
    handleFileListChange,
    handleFileDescriptionChange,
    loadFiles,
    uploadAllFiles,
    reset: resetFiles
  } = useFileAttachment({
    entityType: 'contract',
    entityId: contract?.id,
    autoLoad: false // Загружаем вручную при открытии
  })

  useEffect(() => {
    if (visible && contract) {
      loadInitialData()
      loadFiles() // Используем метод из хука
    }
  }, [visible, contract, loadFiles])

  const loadInitialData = async () => {
    try {
      const contractorsData = await loadContractors()
      setContractors(contractorsData.map(c => ({
        value: c.id,
        label: `${c.name} (ИНН: ${c.inn})`
      })))

      const statusesData = await loadContractStatuses()
      setContractStatuses(statusesData)

      const projectsData = await loadProjects()
      setProjects(projectsData)

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


  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      setLoading(true)

      if (!contract) return

      console.log('[EditContractModal.handleSubmit] Updating contract:', values)

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

      // Загружаем новые файлы через универсальный сервис
      if (fileList.length > 0) {
        await uploadAllFiles()
      }

      message.success('Договор успешно обновлен')
      form.resetFields()
      resetFiles()
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
      <Form form={form} layout="vertical">
        <ContractFormFields
          contractors={contractors}
          contractStatuses={contractStatuses}
          projects={projects}
        />

        <Form.Item label="Файлы договора">
          <FileUploadBlock
            entityType="contract"
            entityId={contract?.id}
            fileList={fileList}
            onFileListChange={handleFileListChange}
            existingFiles={existingFiles}
            onExistingFilesChange={loadFiles}
            fileDescriptions={fileDescriptions}
            onFileDescriptionChange={handleFileDescriptionChange}
            multiple={true}
            maxSize={10}
            disabled={loading || uploading}
          />
        </Form.Item>
      </Form>
    </Modal>
  )
}