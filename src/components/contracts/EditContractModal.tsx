import React, { useState, useEffect } from 'react'
import { Modal, Form, message } from 'antd'
import dayjs from 'dayjs'
import type { UploadFile } from 'antd/es/upload'
import { supabase } from '../../lib/supabase'
import {
  loadContractors,
  loadContractStatuses,
  loadProjects,
  type Contract
} from '../../services/contractOperations'
import { ContractFormFields } from './EditContract/ContractFormFields'
import { ContractFileManager } from './EditContract/ContractFileManager'
import { ContractFileUpload } from './EditContract/ContractFileUpload'

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
  const [loadingFiles, setLoadingFiles] = useState(false)

  useEffect(() => {
    if (visible && contract) {
      loadInitialData()
      loadContractFiles()
    }
  }, [visible, contract])

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

            const { error: uploadError } = await supabase.storage
              .from('attachments')
              .upload(filePath, file.originFileObj)

            if (uploadError) {
              console.error('[EditContractModal.handleSubmit] Upload error:', uploadError)
              continue
            }

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

        <Form.Item label="Существующие файлы">
          <ContractFileManager
            existingFiles={existingFiles}
            loadingFiles={loadingFiles}
            onFilesChange={loadContractFiles}
          />
        </Form.Item>

        <Form.Item label="Добавить новые файлы">
          <ContractFileUpload
            fileList={fileList}
            onChange={setFileList}
          />
        </Form.Item>
      </Form>
    </Modal>
  )
}