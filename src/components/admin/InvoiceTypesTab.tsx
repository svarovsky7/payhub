import { useState, useEffect } from 'react'
import { Table, Space, Button, Modal, Form, Input, message } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { supabase, type InvoiceType } from '../../lib/supabase'

export const InvoiceTypesTab = () => {
  const [invoiceTypes, setInvoiceTypes] = useState<InvoiceType[]>([])
  const [loading, setLoading] = useState(false)
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [editingType, setEditingType] = useState<InvoiceType | null>(null)
  const [form] = Form.useForm()

  useEffect(() => {
    loadInvoiceTypes()
  }, [])

  const loadInvoiceTypes = async () => {
    console.log('[InvoiceTypesTab.loadInvoiceTypes] Loading invoice types')
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('invoice_types')
        .select('*')
        .order('name')

      if (error) throw error

      console.log('[InvoiceTypesTab.loadInvoiceTypes] Loaded invoice types:', data?.length || 0)
      setInvoiceTypes(data || [])
    } catch (error) {
      console.error('[InvoiceTypesTab.loadInvoiceTypes] Error:', error)
      message.error('Ошибка загрузки типов счетов')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    console.log('[InvoiceTypesTab.handleCreate] Opening create modal')
    setEditingType(null)
    form.resetFields()
    setIsModalVisible(true)
  }

  const handleEdit = (record: InvoiceType) => {
    console.log('[InvoiceTypesTab.handleEdit] Editing invoice type:', record.id)
    setEditingType(record)
    form.setFieldsValue(record)
    setIsModalVisible(true)
  }

  const handleSubmit = async (values: any) => {
    console.log('[InvoiceTypesTab.handleSubmit] Submitting:', values)
    try {
      if (editingType) {
        const { error } = await supabase
          .from('invoice_types')
          .update({
            code: values.code,
            name: values.name,
            description: values.description
          })
          .eq('id', editingType.id)

        if (error) throw error
        message.success('Тип счета обновлен')
      } else {
        const { error } = await supabase
          .from('invoice_types')
          .insert([values])

        if (error) throw error
        message.success('Тип счета создан')
      }

      setIsModalVisible(false)
      loadInvoiceTypes()
    } catch (error: any) {
      console.error('[InvoiceTypesTab.handleSubmit] Error:', error)
      if (error.code === '23505') {
        message.error('Тип счета с таким кодом уже существует')
      } else {
        message.error(error.message || 'Ошибка сохранения типа счета')
      }
    }
  }

  const handleDelete = async (id: number) => {
    console.log('[InvoiceTypesTab.handleDelete] Deleting invoice type:', id)
    Modal.confirm({
      title: 'Удалить тип счета?',
      content: 'Все счета с этим типом потеряют связь с типом. Это действие нельзя отменить.',
      okText: 'Удалить',
      cancelText: 'Отмена',
      okType: 'danger',
      onOk: async () => {
        try {
          const { error } = await supabase
            .from('invoice_types')
            .delete()
            .eq('id', id)

          if (error) throw error

          message.success('Тип счета удален')
          loadInvoiceTypes()
        } catch (error: any) {
          console.error('[InvoiceTypesTab.handleDelete] Error:', error)
          if (error.code === '23503') {
            message.error('Невозможно удалить тип счета, так как он используется в счетах')
          } else {
            message.error(error.message || 'Ошибка удаления типа счета')
          }
        }
      }
    })
  }

  const columns: ColumnsType<InvoiceType> = [
    {
      title: 'Код',
      dataIndex: 'code',
      key: 'code',
      width: 150
    },
    {
      title: 'Название',
      dataIndex: 'name',
      key: 'name'
    },
    {
      title: 'Описание',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <Space size="small">
          <Button
            icon={<EditOutlined />}
            size="small"
            onClick={() => handleEdit(record)}
          />
          <Button
            icon={<DeleteOutlined />}
            size="small"
            danger
            onClick={() => handleDelete(record.id)}
          />
        </Space>
      )
    }
  ]

  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleCreate}
        >
          Добавить тип счета
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={invoiceTypes}
        loading={loading}
        rowKey="id"
        pagination={{
          pageSize: 10,
          showTotal: (total) => `Всего: ${total} типов`
        }}
      />

      <Modal
        title={editingType ? 'Редактировать тип счета' : 'Создать тип счета'}
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
        width={500}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            name="code"
            label="Код"
            rules={[
              { required: true, message: 'Введите код типа счета' },
              { max: 50, message: 'Максимум 50 символов' },
              { pattern: /^[a-z0-9_-]+$/, message: 'Только латинские буквы, цифры, дефис и подчеркивание' }
            ]}
          >
            <Input placeholder="Например: material, service" />
          </Form.Item>

          <Form.Item
            name="name"
            label="Название"
            rules={[
              { required: true, message: 'Введите название типа счета' },
              { max: 255, message: 'Максимум 255 символов' }
            ]}
          >
            <Input placeholder="Например: Материалы, Услуги" />
          </Form.Item>

          <Form.Item
            name="description"
            label="Описание"
          >
            <Input.TextArea rows={3} placeholder="Описание типа счета" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setIsModalVisible(false)}>
                Отмена
              </Button>
              <Button type="primary" htmlType="submit">
                {editingType ? 'Обновить' : 'Создать'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}