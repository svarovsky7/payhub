import { useState, useEffect } from 'react'
import { Table, Space, Button, Modal, Form, Input, message } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { supabase, type Role } from '../../lib/supabase'

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
    console.log('[RolesTab.loadRoles] Loading roles')
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('roles')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      console.log('[RolesTab.loadRoles] Loaded roles:', data?.length || 0)
      setRoles(data || [])
    } catch (error) {
      console.error('[RolesTab.loadRoles] Error:', error)
      message.error('Ошибка загрузки ролей')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    console.log('[RolesTab.handleCreate] Opening create modal')
    setEditingRole(null)
    form.resetFields()
    setIsModalVisible(true)
  }

  const handleEdit = (record: Role) => {
    console.log('[RolesTab.handleEdit] Editing role:', record.id)
    setEditingRole(record)
    form.setFieldsValue(record)
    setIsModalVisible(true)
  }

  const handleSubmit = async (values: any) => {
    console.log('[RolesTab.handleSubmit] Submitting:', values)
    try {
      if (editingRole) {
        const { error } = await supabase
          .from('roles')
          .update(values)
          .eq('id', editingRole.id)

        if (error) throw error
        message.success('Роль обновлена')
      } else {
        const { error } = await supabase
          .from('roles')
          .insert([values])

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
    console.log('[RolesTab.handleDelete] Deleting role:', id)
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
      key: 'code',
      width: 120
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