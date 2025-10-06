import { Form, Modal, Input, DatePicker, Select, Row, Col, Space, Button, Table, InputNumber, message } from 'antd'
import { useState, useEffect, useCallback } from 'react'
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import 'dayjs/locale/ru'
import type { MaterialRequest } from '../../services/materialRequestOperations'
import type { Project } from '../../lib/supabase'
import type { Employee } from '../../services/employeeOperations'
import { loadMaterialNomenclaturePaginated } from '../../services/materialNomenclatureOperations'
import type { MaterialNomenclature } from '../../services/materialNomenclatureOperations'

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
  nomenclature_id?: number | null
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
  const [nomenclatureOptions, setNomenclatureOptions] = useState<MaterialNomenclature[]>([])
  const [searchingNomenclature, setSearchingNomenclature] = useState(false)

  // Server-side search across entire database
  const handleSearchNomenclature = useCallback(async (searchText: string) => {
    if (!searchText || !searchText.trim()) {
      // No search text - clear options
      setNomenclatureOptions([])
      return
    }

    setSearchingNomenclature(true)
    try {
      // Search entire database with server-side multi-word support
      const result = await loadMaterialNomenclaturePaginated({
        page: 1,
        pageSize: 200, // Limit to 200 results for dropdown
        searchText: searchText.trim(),
        activeOnly: true
      })

      setNomenclatureOptions(result.data)
      console.log('[MaterialRequestFormModal] Server search results:', result.data.length, 'matches for:', searchText, '(out of', result.total, 'total)')
    } catch (error) {
      console.error('[MaterialRequestFormModal] Error searching nomenclature:', error)
      setNomenclatureOptions([])
    } finally {
      setSearchingNomenclature(false)
    }
  }, [])

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
          quantity: item.quantity,
          nomenclature_id: item.nomenclature_id
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
          quantity: 1,
          nomenclature_id: null
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
      quantity: 1,
      nomenclature_id: null
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
          quantity: item.quantity,
          nomenclature_id: item.nomenclature_id
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
      width: '30%',
      render: (_: any, record: EditableItem) => (
        <Input
          value={record.material_name}
          onChange={e => handleItemChange(record.key, 'material_name', e.target.value)}
          placeholder="Введите наименование"
        />
      )
    },
    {
      title: 'Номенклатура',
      key: 'nomenclature',
      width: '25%',
      render: (_: any, record: EditableItem) => (
        <Select
          value={record.nomenclature_id}
          onChange={value => {
            if (value) {
              const selectedNom = nomenclatureOptions.find(n => n.id === value)
              if (selectedNom) {
                setItems(items.map(item =>
                  item.key === record.key ? {
                    ...item,
                    nomenclature_id: selectedNom.id,
                    unit: selectedNom.unit
                  } : item
                ))
              }
            } else {
              handleItemChange(record.key, 'nomenclature_id', null)
            }
          }}
          showSearch
          allowClear
          placeholder="Начните вводить для поиска"
          filterOption={false}
          onSearch={handleSearchNomenclature}
          loading={searchingNomenclature}
          notFoundContent={searchingNomenclature ? 'Поиск...' : 'Не найдено'}
          popupMatchSelectWidth={false}
          listHeight={400}
          popupClassName="nomenclature-select-dropdown"
          style={{ width: '100%' }}
          options={nomenclatureOptions.map(nom => ({
            value: nom.id,
            label: `${nom.name} (${nom.unit})`
          }))}
        />
      )
    },
    {
      title: 'Ед. изм.',
      dataIndex: 'unit',
      key: 'unit',
      width: '12%',
      render: (_: any, record: EditableItem) => (
        <Input
          value={record.unit}
          disabled
          style={{ width: '100%', backgroundColor: '#f5f5f5' }}
        />
      )
    },
    {
      title: 'Количество',
      dataIndex: 'quantity',
      key: 'quantity',
      width: '12%',
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
              label="Получатель материалов"
            >
              <Select
                placeholder="Выберите получателя"
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