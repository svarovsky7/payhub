import { useState, useEffect } from 'react'
import { Table, Space, Button, Modal, Form, Input, Switch, message, Tooltip, Select, Tag } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { supabase, type Role } from '../../lib/supabase'

// Определение доступных страниц
const AVAILABLE_PAGES = [
  { value: '/invoices', label: 'Счета' },
  { value: '/material-requests', label: 'Заявки на материалы' },
  { value: '/contracts', label: 'Договоры' },
  { value: '/approvals', label: 'Согласования' },
  { value: '/admin', label: 'Администрирование' },
]

export const RolesTab = () => {
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(false)
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [editingRole, setEditingRole] = useState<Role | null>(null)
  const [form] = Form.useForm()

  useEffect(() => {
    loadRoles()
  }, [])

  const loadRoles = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('roles')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      setRoles(data || [])
    } catch (error) {
      console.error('[RolesTab.loadRoles] Error:', error)
      message.error('Ошибка загрузки ролей')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setEditingRole(null)
    form.resetFields()
    setIsModalVisible(true)
  }

  const handleEdit = (record: Role) => {
    setEditingRole(record)
    // Парсим allowed_pages из JSON, если это строка
    const allowedPages = record.allowed_pages
      ? (typeof record.allowed_pages === 'string'
          ? JSON.parse(record.allowed_pages)
          : record.allowed_pages)
      : []

    form.setFieldsValue({
      ...record,
      allowed_pages: allowedPages
    })
    setIsModalVisible(true)
  }

  const handleSubmit = async (values: any) => {
    try {
      // Преобразуем allowed_pages в JSON строку для хранения в базе
      const dataToSave = {
        ...values,
        allowed_pages: JSON.stringify(values.allowed_pages || [])
      }

      if (editingRole) {
        const { error } = await supabase
          .from('roles')
          .update(dataToSave)
          .eq('id', editingRole.id)

        if (error) throw error
        message.success('Роль обновлена')
      } else {
        const { error } = await supabase
          .from('roles')
          .insert([dataToSave])

        if (error) throw error
        message.success('Роль создана')
      }

      setIsModalVisible(false)
      loadRoles()
    } catch (error: any) {
      console.error('[RolesTab.handleSubmit] Error:', error)
      message.error(error.message || 'Ошибка сохранения роли')
    }
  }

  const handleDelete = async (id: number) => {
    Modal.confirm({
      title: 'Удалить роль?',
      content: 'Это действие нельзя отменить',
      okText: 'Удалить',
      cancelText: 'Отмена',
      okType: 'danger',
      onOk: async () => {
        try {
          const { error } = await supabase
            .from('roles')
            .delete()
            .eq('id', id)

          if (error) throw error
          message.success('Роль удалена')
          loadRoles()
        } catch (error) {
          console.error('[RolesTab.handleDelete] Error:', error)
          message.error('Ошибка удаления роли')
        }
      }
    })
  }

  const columns: ColumnsType<Role> = [
    {
      title: 'Код',
      dataIndex: 'code',
      key: 'code'
    },
    {
      title: 'Название',
      dataIndex: 'name',
      key: 'name'
    },
    {
      title: 'Описание',
      dataIndex: 'description',
      key: 'description'
    },
    {
      title: 'Доступные страницы',
      dataIndex: 'allowed_pages',
      key: 'allowed_pages',
      render: (value: any) => {
        const pages = value
          ? (typeof value === 'string' ? JSON.parse(value) : value)
          : []

        if (pages.length === 0) {
          return <Tag color="red">Нет доступа</Tag>
        }

        const pageLabels = pages.map((page: string) => {
          const pageInfo = AVAILABLE_PAGES.find(p => p.value === page)
          return pageInfo ? pageInfo.label : page
        })

        if (pageLabels.length > 2) {
          return (
            <Tooltip title={pageLabels.join(', ')}>
              <span>
                {pageLabels.slice(0, 2).map((label: string, index: number) => (
                  <Tag key={index} color="blue">{label}</Tag>
                ))}
                <Tag color="blue">+{pageLabels.length - 2}</Tag>
              </span>
            </Tooltip>
          )
        }

        return pageLabels.map((label: string, index: number) => (
          <Tag key={index} color="blue">{label}</Tag>
        ))
      }
    },
    {
      title: 'Только свои проекты',
      dataIndex: 'own_projects_only',
      key: 'own_projects_only',
      align: 'center',
      render: (value: boolean) => (
        <Tooltip title={value ? 'Видит только данные своих проектов' : 'Видит данные всех проектов'}>
          <Switch checked={value} disabled />
        </Tooltip>
      )
    },
    {
      title: 'Действия',
      key: 'actions',
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
          Добавить роль
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={roles}
        loading={loading}
        rowKey="id"
        pagination={{
          pageSize: 10,
          showTotal: (total) => `Всего: ${total} ролей`
        }}
      />

      <Modal
        title={editingRole ? 'Редактировать роль' : 'Создать роль'}
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
              { required: true, message: 'Введите код роли' },
              { max: 50, message: 'Максимум 50 символов' }
            ]}
          >
            <Input placeholder="Например: admin" />
          </Form.Item>

          <Form.Item
            name="name"
            label="Название"
            rules={[{ required: true, message: 'Введите название роли' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item name="description" label="Описание">
            <Input.TextArea rows={3} />
          </Form.Item>

          <Form.Item
            name="allowed_pages"
            label="Доступные страницы"
            rules={[{ required: false, message: 'Выберите доступные страницы' }]}
            help="Выберите страницы, к которым будет иметь доступ роль"
          >
            <Select
              mode="multiple"
              placeholder="Выберите страницы"
              options={AVAILABLE_PAGES}
            />
          </Form.Item>

          <Form.Item
            name="own_projects_only"
            label="Только свои проекты"
            valuePropName="checked"
            initialValue={false}
            help="Если включено, пользователи с этой ролью будут видеть только данные проектов, к которым они привязаны"
          >
            <Switch />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setIsModalVisible(false)}>
                Отмена
              </Button>
              <Button type="primary" htmlType="submit">
                {editingRole ? 'Обновить' : 'Создать'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}