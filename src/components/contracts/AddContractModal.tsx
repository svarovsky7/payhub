import React, { useState, useEffect } from 'react'
import {
  Modal,
  Form,
  Input,
  DatePicker,
  Select,
  InputNumber,
  Button,
  message,
  Row,
  Col,
  Space,
  Tag
} from 'antd'
import dayjs from 'dayjs'
import { supabase } from '../../lib/supabase'
import { loadContractors, loadContractStatuses, loadProjects, generateContractNumber, linkProjectsToContract } from '../../services/contractOperations'
import { FileUploadBlock } from '../common/FileUploadBlock'
import { useFileAttachment } from '../../hooks/useFileAttachment'
import { uploadAndLinkFile } from '../../services/fileAttachmentService'
import { useAuth } from '../../contexts/AuthContext'

const { TextArea } = Input

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

interface Project {
  id: number
  code?: string
  name: string
  is_active: boolean
}

export const AddContractModal: React.FC<AddContractModalProps> = ({
  visible,
  onCancel,
  onSuccess
}) => {
  const { user } = useAuth()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [contractors, setContractors] = useState<ContractorOption[]>([])
  const [contractStatuses, setContractStatuses] = useState<ContractStatus[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [generatingNumber, setGeneratingNumber] = useState(false)

  // Используем хук для управления файлами
  const {
    fileList,
    fileDescriptions,
    uploading,
    handleFileListChange,
    handleFileDescriptionChange,
    reset: resetFiles
  } = useFileAttachment({
    entityType: 'contract',
    entityId: undefined, // Договор еще не создан
    autoLoad: false
  })

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

      // Загружаем проекты
      const projectsData = await loadProjects()
      setProjects(projectsData)

      // Устанавливаем статус по умолчанию
      const activeStatus = statusesData.find(s => s.code === 'active' || s.id === 2)
      if (activeStatus) {
        form.setFieldsValue({ statusId: activeStatus.id })
      }
    } catch (error) {
      console.error('[AddContractModal.loadInitialData] Error:', error)
      message.error('Ошибка загрузки данных')
    }
  }


  const handleGenerateNumber = async () => {
    setGeneratingNumber(true)
    try {
      const generatedNumber = await generateContractNumber()
      form.setFieldsValue({ contractNumber: generatedNumber })
    } catch (error) {
      console.error('[AddContractModal.handleGenerateNumber] Error:', error)
    } finally {
      setGeneratingNumber(false)
    }
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      setLoading(true)

      console.log('[AddContractModal.handleSubmit] Creating contract:', values)

      if (!user) {
        throw new Error('Пользователь не авторизован')
      }

      // Создаём договор (без project_id - теперь используем contract_projects)
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
          warranty_period_days: values.warrantyPeriodDays,
          description: values.description,
          created_by: user.id
        })
        .select()
        .single()

      if (error) throw error

      // Связываем проекты с договором через contract_projects
      if (values.projectIds && values.projectIds.length > 0) {
        await linkProjectsToContract(contract.id, values.projectIds)
      }

      // Загружаем файлы, если есть
      if (fileList.length > 0) {
        for (const file of fileList) {
          if (file.originFileObj) {
            try {
              await uploadAndLinkFile({
                file: file.originFileObj,
                entityType: 'contract',
                entityId: contract.id,
                description: fileDescriptions[file.uid] || `Файл договора ${values.contractNumber}`,
                userId: user.id
              })
            } catch (error) {
              console.error('[AddContractModal] File upload error:', error)
            }
          }
        }
      }

      message.success('Договор успешно создан')
      form.resetFields()
      resetFiles()
      onSuccess()
      onCancel()
    } catch (error) {
      console.error('[AddContractModal.handleSubmit] Error:', error)
      message.error('Ошибка при создании договора')
    } finally {
      setLoading(false)
    }
  }

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
                <Input
                  placeholder="Например: Д-09/25-001"
                  autoComplete="off"
                  disabled={generatingNumber}
                  addonAfter={
                    <Button
                      size="small"
                      type="link"
                      onClick={handleGenerateNumber}
                      loading={generatingNumber}
                    >
                      Сгенерировать
                    </Button>
                  }
                />
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
            <Col span={24}>
              <Form.Item
                name="projectIds"
                label="Проекты"
              >
                <Select
                  mode="multiple"
                  placeholder="Выберите проекты"
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

          <Form.Item label="Файлы договора">
            <FileUploadBlock
              entityType="contract"
              fileList={fileList}
              onFileListChange={handleFileListChange}
              fileDescriptions={fileDescriptions}
              onFileDescriptionChange={handleFileDescriptionChange}
              multiple={true}
              maxSize={10}
              disabled={loading || uploading}
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}