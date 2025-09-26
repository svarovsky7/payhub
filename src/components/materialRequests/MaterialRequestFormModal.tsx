import { Form, Modal, Input, DatePicker, Select, Row, Col, Space, Button, Table, InputNumber, message } from 'antd'
import { useState, useEffect } from 'react'
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons'
import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'
import 'dayjs/locale/ru'
import type { MaterialRequest, MaterialRequestItem } from '../../services/materialRequestOperations'
import type { Project } from '../../lib/supabase'
import type { Employee } from '../../services/employeeOperations'

dayjs.locale('ru')

interface MaterialRequestFormModalProps {
  isVisible: boolean
  editingRequest?: MaterialRequest | null
  onClose: () => void
  onSubmit: (values: any) => void
  projects: Project[]
  employees: Employee[]
  onGenerateRequestNumber: () => Promise<string>
}

interface EditableItem {
  key: string
  material_name: string
  unit: string
  quantity: number
}

export const MaterialRequestFormModal: React.FC<MaterialRequestFormModalProps> = ({
  isVisible,
  editingRequest,
  onClose,
  onSubmit,
  projects,
  employees,
  onGenerateRequestNumber
}) => {
  const [form] = Form.useForm()
  const [items, setItems] = useState<EditableItem[]>([])
  const [generatingNumber, setGeneratingNumber] = useState(false)

  // Initialize form when modal opens
  useEffect(() => {
    if (isVisible) {
      if (editingRequest) {
        // Editing existing request
        form.setFieldsValue({
          request_number: editingRequest.request_number,
          request_date: dayjs(editingRequest.request_date),
          project_id: editingRequest.project_id,
          employee_id: editingRequest.employee_id
        })

        // Set items
        const editableItems: EditableItem[] = (editingRequest.items || []).map((item, index) => ({
          key: item.id || `item-${index}`,
          material_name: item.material_name,
          unit: item.unit,
          quantity: item.quantity
        }))
        setItems(editableItems)
      } else {
        // Creating new request
        form.resetFields()
        form.setFieldsValue({
          request_date: dayjs()
        })

        // Add one empty row
        setItems([{
          key: `item-${Date.now()}`,
          material_name: '',
          unit: 'шт',
          quantity: 1
        }])

        // Generate request number
        handleGenerateNumber()
      }
    }
  }, [isVisible, editingRequest, form])

  const handleGenerateNumber = async () => {
    setGeneratingNumber(true)
    try {
      const number = await onGenerateRequestNumber()
      form.setFieldsValue({ request_number: number })
    } catch (error) {
      console.error('Error generating request number:', error)
    } finally {
      setGeneratingNumber(false)
    }
  }

  const handleAddItem = () => {
    const newItem: EditableItem = {
      key: `item-${Date.now()}`,
      material_name: '',
      unit: 'шт',
      quantity: 1
    }
    setItems([...items, newItem])
  }

  const handleDeleteItem = (key: string) => {
    setItems(items.filter(item => item.key !== key))
  }

  const handleItemChange = (key: string, field: keyof EditableItem, value: any) => {
    setItems(items.map(item =>
      item.key === key ? { ...item, [field]: value } : item
    ))
  }

  const handleSubmit = () => {
    form.validateFields().then(values => {
      // Validate items
      const validItems = items.filter(item => item.material_name && item.unit && item.quantity > 0)

      if (validItems.length === 0) {
        message.error('Добавьте хотя бы одну позицию')
        return
      }

      const formData = {
        ...values,
        request_date: values.request_date.format('YYYY-MM-DD'),
        items: validItems.map(item => ({
          material_name: item.material_name,
          unit: item.unit,
          quantity: item.quantity
        }))
      }

      onSubmit(formData)
    })
  }

  const columns = [
    {
      title: 'Наименование материала',
      dataIndex: 'material_name',
      key: 'material_name',
      width: '40%',
      render: (_: any, record: EditableItem) => (
        <Input
          value={record.material_name}
          onChange={e => handleItemChange(record.key, 'material_name', e.target.value)}
          placeholder="Введите наименование"
        />
      )
    },
    {
      title: 'Ед. изм.',
      dataIndex: 'unit',
      key: 'unit',
      width: '15%',
      render: (_: any, record: EditableItem) => (
        <Select
          value={record.unit}
          onChange={value => handleItemChange(record.key, 'unit', value)}
          style={{ width: '100%' }}
        >
          <Select.Option value="шт">шт</Select.Option>
          <Select.Option value="кг">кг</Select.Option>
          <Select.Option value="т">т</Select.Option>
          <Select.Option value="м">м</Select.Option>
          <Select.Option value="м2">м²</Select.Option>
          <Select.Option value="м3">м³</Select.Option>
          <Select.Option value="л">л</Select.Option>
          <Select.Option value="упак">упак</Select.Option>
          <Select.Option value="компл">компл</Select.Option>
        </Select>
      )
    },
    {
      title: 'Количество',
      dataIndex: 'quantity',
      key: 'quantity',
      width: '15%',
      render: (_: any, record: EditableItem) => (
        <InputNumber
          value={record.quantity}
          onChange={value => handleItemChange(record.key, 'quantity', value || 0)}
          min={0.001}
          step={1}
          precision={3}
          style={{ width: '100%' }}
        />
      )
},
    {
      title: '',
      key: 'actions',
      width: '5%',
      render: (_: any, record: EditableItem) => (
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          onClick={() => handleDeleteItem(record.key)}
          disabled={items.length === 1}
        />
      )
    }
  ]

  return (
    <Modal
      title={editingRequest ? 'Редактировать заявку на материалы' : 'Создать заявку на материалы'}
      open={isVisible}
      onCancel={onClose}
      footer={null}
      width={1200}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
      >
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item
              name="request_number"
              label="Номер заявки"
              rules={[{ required: true, message: 'Укажите номер заявки' }]}
            >
              <Input
                placeholder="МТ-2024-001"
                disabled={generatingNumber}
                addonAfter={
                  !editingRequest && (
                    <Button
                      size="small"
                      type="link"
                      onClick={handleGenerateNumber}
                      loading={generatingNumber}
                    >
                      Сгенерировать
                    </Button>
                  )
                }
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name="request_date"
              label="Дата заявки"
              rules={[{ required: true, message: 'Укажите дату заявки' }]}
            >
              <DatePicker
                style={{ width: '100%' }}
                format="DD.MM.YYYY"
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="project_id"
              label="Проект"
            >
              <Select
                placeholder="Выберите проект"
                showSearch
                optionFilterProp="label"
                allowClear
                options={projects.map(project => ({
                  value: project.id,
                  label: project.name
                }))}
              />
            </Form.Item>
          </Col>
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
                  .map(employee => ({
                    value: employee.id,
                    label: employee.full_name || `${employee.last_name} ${employee.first_name}`
                  }))}
              />
            </Form.Item>
          </Col>
        </Row>

        <div style={{ marginBottom: 16 }}>
          <h4 style={{ marginBottom: 8 }}>Перечень материалов</h4>

          <Table
            dataSource={items}
            columns={columns}
            rowKey="key"
            pagination={false}
            size="small"
            scroll={{ y: 300 }}
            style={{ marginBottom: 16 }}
          />

          <Button
            type="dashed"
            onClick={handleAddItem}
            icon={<PlusOutlined />}
            style={{ width: '100%' }}
          >
            Добавить позицию
          </Button>
        </div>

        <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
          <Space>
            <Button onClick={onClose}>
              Отмена
            </Button>
            <Button type="primary" htmlType="submit">
              {editingRequest ? 'Сохранить' : 'Создать'}
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  )
}