import { useState, useEffect } from 'react'
import { Table, Space, Button, Modal, Form, Input, InputNumber, Select, message } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { supabase, type InvoiceStatus } from '../../lib/supabase'

const colorOptions = [
  { value: 'default', label: 'Серый' },
  { value: 'processing', label: 'Синий' },
  { value: 'success', label: 'Зеленый' },
  { value: 'warning', label: 'Оранжевый' },
  { value: 'error', label: 'Красный' },
  { value: 'purple', label: 'Фиолетовый' },
  { value: 'cyan', label: 'Голубой' }
]

export const InvoiceStatusesTab = () => {
  const [statuses, setStatuses] = useState<InvoiceStatus[]>([])
  const [loading, setLoading] = useState(false)
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [editingStatus, setEditingStatus] = useState<InvoiceStatus | null>(null)
  const [form] = Form.useForm()

  useEffect(() => {
    loadStatuses()
  }, [])

  const loadStatuses = async () => {
    console.log('[InvoiceStatusesTab.loadStatuses] Loading invoice statuses')
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('invoice_statuses')
        .select('*')
        .order('sort_order')

      if (error) throw error

      console.log('[InvoiceStatusesTab.loadStatuses] Loaded statuses:', data?.length || 0)
      setStatuses(data || [])
    } catch (error) {
      console.error('[InvoiceStatusesTab.loadStatuses] Error:', error)
      message.error('Ошибка загрузки статусов счетов')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    console.log('[InvoiceStatusesTab.handleCreate] Opening create modal')
    setEditingStatus(null)
    form.resetFields()
    // Устанавливаем следующий порядковый номер
    const maxOrder = Math.max(...statuses.map(s => s.sort_order || 0), 0)
    form.setFieldsValue({ sort_order: maxOrder + 10 })
    setIsModalVisible(true)
  }

  const handleEdit = (record: InvoiceStatus) => {
    console.log('[InvoiceStatusesTab.handleEdit] Editing status:', record.id)
    setEditingStatus(record)
    form.setFieldsValue(record)
    setIsModalVisible(true)
  }

  const handleSubmit = async (values: any) => {
    console.log('[InvoiceStatusesTab.handleSubmit] Submitting:', values)
    try {
      if (editingStatus) {
        const { error } = await supabase
          .from('invoice_statuses')
          .update({
            code: values.code,
            name: values.name,
            description: values.description,
            sort_order: values.sort_order,
            color: values.color
          })
          .eq('id', editingStatus.id)

        if (error) throw error
        message.success('Статус обновлен')
      } else {
        const { error } = await supabase
          .from('invoice_statuses')
          .insert([values])

        if (error) throw error
        message.success('Статус создан')
      }

      setIsModalVisible(false)
      loadStatuses()
    } catch (error: any) {
      console.error('[InvoiceStatusesTab.handleSubmit] Error:', error)
      if (error.code === '23505') {
        message.error('Статус с таким кодом уже существует')
      } else {
        message.error(error.message || 'Ошибка сохранения статуса')
      }
    }
  }

  const handleDelete = async (id: number) => {
    console.log('[InvoiceStatusesTab.handleDelete] Deleting status:', id)
    Modal.confirm({
      title: 'Удалить статус?',
      content: 'Все счета с этим статусом потеряют связь. Это действие нельзя отменить.',
      okText: 'Удалить',
      cancelText: 'Отмена',
      okType: 'danger',
      onOk: async () => {
        try {
          const { error } = await supabase
            .from('invoice_statuses')
            .delete()
            .eq('id', id)

          if (error) throw error

          message.success('Статус удален')
          loadStatuses()
        } catch (error: any) {
          console.error('[InvoiceStatusesTab.handleDelete] Error:', error)
          if (error.code === '23503') {
            message.error('Невозможно удалить статус, так как он используется в счетах')
          } else {
            message.error(error.message || 'Ошибка удаления статуса')
          }
        }
      }
    })
  }

  const handleMoveUp = async (record: InvoiceStatus) => {
    const index = statuses.findIndex(s => s.id === record.id)
    if (index > 0) {
      const prevStatus = statuses[index - 1]

      try {
        // Меняем местами sort_order
        await supabase
          .from('invoice_statuses')
          .update({ sort_order: prevStatus.sort_order })
          .eq('id', record.id)

        await supabase
          .from('invoice_statuses')
          .update({ sort_order: record.sort_order })
          .eq('id', prevStatus.id)

        loadStatuses()
      } catch (error) {
        console.error('[InvoiceStatusesTab.handleMoveUp] Error:', error)
        message.error('Ошибка изменения порядка')
      }
    }
  }

  const handleMoveDown = async (record: InvoiceStatus) => {
    const index = statuses.findIndex(s => s.id === record.id)
    if (index < statuses.length - 1) {
      const nextStatus = statuses[index + 1]

      try {
        // Меняем местами sort_order
        await supabase
          .from('invoice_statuses')
          .update({ sort_order: nextStatus.sort_order })
          .eq('id', record.id)

        await supabase
          .from('invoice_statuses')
          .update({ sort_order: record.sort_order })
          .eq('id', nextStatus.id)

        loadStatuses()
      } catch (error) {
        console.error('[InvoiceStatusesTab.handleMoveDown] Error:', error)
        message.error('Ошибка изменения порядка')
      }
    }
  }

  const getColorBadge = (color?: string) => {
    const colorName = colorOptions.find(c => c.value === color)?.label || color
    const colors: { [key: string]: string } = {
      default: '#d9d9d9',
      processing: '#1677ff',
      success: '#52c41a',
      warning: '#faad14',
      error: '#ff4d4f',
      purple: '#722ed1',
      cyan: '#13c2c2'
    }

    return (
      <span
        style={{
          display: 'inline-block',
          padding: '2px 8px',
          borderRadius: '4px',
          backgroundColor: colors[color || 'default'] || '#d9d9d9',
          color: '#fff',
          fontSize: '12px'
        }}
      >
        {colorName}
      </span>
    )
  }

  const columns: ColumnsType<InvoiceStatus> = [
    {
      title: '№',
      key: 'sort',
      width: 80,
      render: (_, record, index) => (
        <Space>
          <span>{index + 1}</span>
          <Space direction="vertical" size={0}>
            <Button
              size="small"
              type="text"
              icon={<ArrowUpOutlined />}
              disabled={index === 0}
              onClick={() => handleMoveUp(record)}
            />
            <Button
              size="small"
              type="text"
              icon={<ArrowDownOutlined />}
              disabled={index === statuses.length - 1}
              onClick={() => handleMoveDown(record)}
            />
          </Space>
        </Space>
      )
    },
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
      title: 'Цвет',
      dataIndex: 'color',
      key: 'color',
      width: 120,
      render: (color) => getColorBadge(color)
    },
    {
      title: 'Описание',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true
    },
    {
      title: 'Порядок',
      dataIndex: 'sort_order',
      key: 'sort_order',
      width: 80
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
          Добавить статус
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={statuses}
        loading={loading}
        rowKey="id"
        pagination={false}
      />

      <Modal
        title={editingStatus ? 'Редактировать статус' : 'Создать статус'}
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
              { required: true, message: 'Введите код статуса' },
              { max: 50, message: 'Максимум 50 символов' },
              { pattern: /^[a-z0-9_-]+$/, message: 'Только латинские буквы, цифры, дефис и подчеркивание' }
            ]}
          >
            <Input placeholder="Например: draft, paid, cancelled" />
          </Form.Item>

          <Form.Item
            name="name"
            label="Название"
            rules={[
              { required: true, message: 'Введите название статуса' },
              { max: 255, message: 'Максимум 255 символов' }
            ]}
          >
            <Input placeholder="Например: Черновик, Оплачен, Отменен" />
          </Form.Item>

          <Form.Item
            name="color"
            label="Цвет"
            rules={[{ required: true, message: 'Выберите цвет' }]}
          >
            <Select
              placeholder="Выберите цвет для отображения"
              options={colorOptions}
            />
          </Form.Item>

          <Form.Item
            name="description"
            label="Описание"
          >
            <Input.TextArea rows={3} placeholder="Описание статуса" />
          </Form.Item>

          <Form.Item
            name="sort_order"
            label="Порядок сортировки"
            rules={[{ required: true, message: 'Укажите порядок' }]}
          >
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              placeholder="Порядковый номер для сортировки"
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setIsModalVisible(false)}>
                Отмена
              </Button>
              <Button type="primary" htmlType="submit">
                {editingStatus ? 'Обновить' : 'Создать'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}