import { useState, useEffect } from 'react'
import { Table, Space, Button, Modal, Form, Input, message, Tabs, Select } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { supabase, type ContractorType, type InvoiceType, type PaymentType } from '../../lib/supabase'
import dayjs from 'dayjs'

interface TypeRecord {
  id: number
  name: string
  code?: string
  is_active?: boolean
  created_at: string
  updated_at?: string
}

export const TypesTab = () => {
  // Состояния для типов контрагентов
  const [contractorTypes, setContractorTypes] = useState<ContractorType[]>([])
  const [contractorTypesLoading, setContractorTypesLoading] = useState(false)

  // Состояния для типов счетов
  const [invoiceTypes, setInvoiceTypes] = useState<InvoiceType[]>([])
  const [invoiceTypesLoading, setInvoiceTypesLoading] = useState(false)

  // Состояния для типов платежей
  const [paymentTypes, setPaymentTypes] = useState<PaymentType[]>([])
  const [paymentTypesLoading, setPaymentTypesLoading] = useState(false)

  // Общие состояния
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [editingRecord, setEditingRecord] = useState<TypeRecord | null>(null)
  const [currentTypeCategory, setCurrentTypeCategory] = useState<'contractor' | 'invoice' | 'payment'>('contractor')
  const [activeTab, setActiveTab] = useState('contractor-types')
  const [form] = Form.useForm()

  useEffect(() => {
    loadContractorTypes()
    loadInvoiceTypes()
    loadPaymentTypes()
  }, [])

  // Загрузка типов контрагентов
  const loadContractorTypes = async () => {
    setContractorTypesLoading(true)
    try {
      const { data, error } = await supabase
        .from('contractor_types')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      setContractorTypes(data || [])
    } catch (error) {
      console.error('[TypesTab.loadContractorTypes] Error:', error)
      message.error('Ошибка загрузки типов контрагентов')
    } finally {
      setContractorTypesLoading(false)
    }
  }

  // Загрузка типов счетов
  const loadInvoiceTypes = async () => {
    setInvoiceTypesLoading(true)
    try {
      const { data, error } = await supabase
        .from('invoice_types')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      setInvoiceTypes(data || [])
    } catch (error) {
      console.error('[TypesTab.loadInvoiceTypes] Error:', error)
      message.error('Ошибка загрузки типов счетов')
    } finally {
      setInvoiceTypesLoading(false)
    }
  }

  // Загрузка типов платежей
  const loadPaymentTypes = async () => {
    setPaymentTypesLoading(true)
    try {
      const { data, error } = await supabase
        .from('payment_types')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      setPaymentTypes(data || [])
    } catch (error) {
      console.error('[TypesTab.loadPaymentTypes] Error:', error)
      message.error('Ошибка загрузки типов платежей')
    } finally {
      setPaymentTypesLoading(false)
    }
  }

  const handleCreate = (typeCategory: 'contractor' | 'invoice' | 'payment') => {
    setCurrentTypeCategory(typeCategory)
    setEditingRecord(null)
    form.resetFields()
    setIsModalVisible(true)
  }

  const handleEdit = (record: TypeRecord, typeCategory: 'contractor' | 'invoice' | 'payment') => {
    setCurrentTypeCategory(typeCategory)
    setEditingRecord(record)
    form.setFieldsValue(record)
    setIsModalVisible(true)
  }

  const handleSubmit = async (values: any) => {

    const tableName = currentTypeCategory === 'contractor'
      ? 'contractor_types'
      : currentTypeCategory === 'invoice'
        ? 'invoice_types'
        : 'payment_types'

    const typeName = currentTypeCategory === 'contractor'
      ? 'контрагента'
      : currentTypeCategory === 'invoice'
        ? 'счёта'
        : 'платежа'

    try {
      if (editingRecord) {
        const { error } = await supabase
          .from(tableName)
          .update(values)
          .eq('id', editingRecord.id)

        if (error) throw error
        message.success(`Тип ${typeName} обновлен`)
      } else {
        const { error } = await supabase
          .from(tableName)
          .insert([values])

        if (error) throw error
        message.success(`Тип ${typeName} создан`)
      }

      setIsModalVisible(false)

      // Перезагружаем соответствующий список
      if (currentTypeCategory === 'contractor') {
        loadContractorTypes()
      } else if (currentTypeCategory === 'invoice') {
        loadInvoiceTypes()
      } else {
        loadPaymentTypes()
      }
    } catch (error: any) {
      console.error('[TypesTab.handleSubmit] Error:', error)
      message.error(error.message || `Ошибка сохранения типа ${typeName}`)
    }
  }

  const handleDelete = async (id: number, typeCategory: 'contractor' | 'invoice' | 'payment') => {

    const tableName = typeCategory === 'contractor'
      ? 'contractor_types'
      : typeCategory === 'invoice'
        ? 'invoice_types'
        : 'payment_types'

    const typeName = typeCategory === 'contractor'
      ? 'контрагента'
      : typeCategory === 'invoice'
        ? 'счёта'
        : 'платежа'

    const relatedTable = typeCategory === 'contractor'
      ? 'contractors'
      : typeCategory === 'invoice'
        ? 'invoices'
        : 'payments'

    const relatedField = typeCategory === 'contractor'
      ? 'type_id'
      : typeCategory === 'invoice'
        ? 'invoice_type_id'
        : 'payment_type_id'

    Modal.confirm({
      title: `Удалить тип ${typeName}?`,
      content: `Это действие нельзя отменить. Для удаления типа не должно быть связанных записей.`,
      okText: 'Удалить',
      cancelText: 'Отмена',
      okType: 'danger',
      onOk: async () => {
        try {
          // Проверяем наличие связанных записей
          const { data: relatedData, error: checkError } = await supabase
            .from(relatedTable)
            .select('id')
            .eq(relatedField, id)
            .limit(1)

          if (checkError) throw checkError

          if (relatedData && relatedData.length > 0) {
            message.warning(`Невозможно удалить тип ${typeName}, так как есть связанные записи`)
            return
          }

          // Удаляем тип
          const { error } = await supabase
            .from(tableName)
            .delete()
            .eq('id', id)

          if (error) throw error

          message.success(`Тип ${typeName} удален`)

          // Перезагружаем соответствующий список
          if (typeCategory === 'contractor') {
            loadContractorTypes()
          } else if (typeCategory === 'invoice') {
            loadInvoiceTypes()
          } else {
            loadPaymentTypes()
          }
        } catch (error: any) {
          console.error('[TypesTab.handleDelete] Error:', error)
          message.error(error.message || `Ошибка удаления типа ${typeName}`)
        }
      }
    })
  }

  // Базовые колонки для всех типов
  const baseColumns: ColumnsType<TypeRecord> = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
      sorter: (a, b) => a.id - b.id
    },
    {
      title: 'Название',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name)
    },
    {
      title: 'Код',
      dataIndex: 'code',
      key: 'code',
      width: 120,
      sorter: (a, b) => (a.code || '').localeCompare(b.code || ''),
      render: (code: string | undefined) => code || '-'
    },
    {
      title: 'Активен',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 100,
      sorter: (a, b) => {
        const aActive = a.is_active === undefined || a.is_active ? 1 : 0
        const bActive = b.is_active === undefined || b.is_active ? 1 : 0
        return aActive - bActive
      },
      render: (isActive: boolean | undefined) =>
        isActive === undefined || isActive ? 'Да' : 'Нет'
    },
    {
      title: 'Создан',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      sorter: (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      render: (date: string) => date ? dayjs(date).format('DD.MM.YYYY HH:mm') : '-'
    }
  ]

  // Добавляем колонку с действиями
  const getColumns = (typeCategory: 'contractor' | 'invoice' | 'payment'): ColumnsType<TypeRecord> => {
    return [
      ...baseColumns,
      {
        title: 'Действия',
        key: 'actions',
        width: 120,
        render: (_, record) => (
          <Space size="small">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record, typeCategory)}
            />
            <Button
              type="text"
              icon={<DeleteOutlined />}
              danger
              onClick={() => handleDelete(record.id, typeCategory)}
            />
          </Space>
        )
      }
    ]
  }

  // Определяем поля формы для модального окна
  const getModalTitle = () => {
    const typeName = currentTypeCategory === 'contractor'
      ? 'контрагента'
      : currentTypeCategory === 'invoice'
        ? 'счёта'
        : 'платежа'

    return editingRecord
      ? `Редактирование типа ${typeName}`
      : `Создание типа ${typeName}`
  }

  const tabItems = [
    {
      key: 'contractor-types',
      label: 'Типы контрагентов',
      children: (
        <div>
          <div style={{ marginBottom: 16 }}>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => handleCreate('contractor')}
            >
              Добавить тип контрагента
            </Button>
          </div>
          <Table
            columns={getColumns('contractor')}
            dataSource={contractorTypes}
            rowKey="id"
            loading={contractorTypesLoading}
            pagination={{
              defaultPageSize: 10,
              showSizeChanger: true,
              showTotal: (total) => `Всего: ${total}`
            }}
            locale={{
              emptyText: 'Типы контрагентов не найдены'
            }}
          />
        </div>
      )
    },
    {
      key: 'invoice-types',
      label: 'Типы счетов',
      children: (
        <div>
          <div style={{ marginBottom: 16 }}>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => handleCreate('invoice')}
            >
              Добавить тип счёта
            </Button>
          </div>
          <Table
            columns={getColumns('invoice')}
            dataSource={invoiceTypes}
            rowKey="id"
            loading={invoiceTypesLoading}
            pagination={{
              defaultPageSize: 10,
              showSizeChanger: true,
              showTotal: (total) => `Всего: ${total}`
            }}
            locale={{
              emptyText: 'Типы счетов не найдены'
            }}
          />
        </div>
      )
    },
    {
      key: 'payment-types',
      label: 'Типы платежей',
      children: (
        <div>
          <div style={{ marginBottom: 16 }}>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => handleCreate('payment')}
            >
              Добавить тип платежа
            </Button>
          </div>
          <Table
            columns={getColumns('payment')}
            dataSource={paymentTypes}
            rowKey="id"
            loading={paymentTypesLoading}
            pagination={{
              defaultPageSize: 10,
              showSizeChanger: true,
              showTotal: (total) => `Всего: ${total}`
            }}
            locale={{
              emptyText: 'Типы платежей не найдены'
            }}
          />
        </div>
      )
    }
  ]

  return (
    <div>
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
      />

      <Modal
        title={getModalTitle()}
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            name="name"
            label="Название"
            rules={[{ required: true, message: 'Введите название' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="code"
            label="Код"
            rules={[
              { required: true, message: 'Введите код' },
              { max: 50, message: 'Код не должен превышать 50 символов' }
            ]}
          >
            <Input />
          </Form.Item>

          {currentTypeCategory !== 'payment' && (
            <Form.Item
              name="is_active"
              label="Статус"
              valuePropName="value"
              initialValue={true}
            >
              <Select>
                <Select.Option value={true}>Активен</Select.Option>
                <Select.Option value={false}>Неактивен</Select.Option>
              </Select>
            </Form.Item>
          )}

          <Form.Item style={{ marginBottom: 0 }}>
            <Space>
              <Button type="primary" htmlType="submit">
                {editingRecord ? 'Обновить' : 'Создать'}
              </Button>
              <Button onClick={() => setIsModalVisible(false)}>
                Отмена
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}