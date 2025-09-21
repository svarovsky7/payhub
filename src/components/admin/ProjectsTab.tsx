import { useState, useEffect } from 'react'
import { Table, Space, Button, Modal, Form, Input, Switch, message } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { supabase, type Project } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

export const ProjectsTab = () => {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(false)
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [form] = Form.useForm()
  const { user } = useAuth()

  useEffect(() => {
    loadProjects()
  }, [])

  const loadProjects = async () => {
    console.log('[ProjectsTab.loadProjects] Loading projects')
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      console.log('[ProjectsTab.loadProjects] Loaded projects:', data?.length || 0)
      setProjects(data || [])
    } catch (error) {
      console.error('[ProjectsTab.loadProjects] Error:', error)
      message.error('Ошибка загрузки проектов')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    console.log('[ProjectsTab.handleCreate] Opening create modal')
    setEditingProject(null)
    form.resetFields()
    form.setFieldsValue({ is_active: true })
    setIsModalVisible(true)
  }

  const handleEdit = (record: Project) => {
    console.log('[ProjectsTab.handleEdit] Editing project:', record.id)
    setEditingProject(record)
    form.setFieldsValue(record)
    setIsModalVisible(true)
  }

  const handleSubmit = async (values: any) => {
    console.log('[ProjectsTab.handleSubmit] Submitting:', values)
    try {
      if (editingProject) {
        const { error } = await supabase
          .from('projects')
          .update(values)
          .eq('id', editingProject.id)

        if (error) throw error
        message.success('Проект обновлен')
      } else {
        const { error } = await supabase
          .from('projects')
          .insert([{ ...values, created_by: user?.id }])

        if (error) throw error
        message.success('Проект создан')
      }

      setIsModalVisible(false)
      loadProjects()
    } catch (error: any) {
      console.error('[ProjectsTab.handleSubmit] Error:', error)
      message.error(error.message || 'Ошибка сохранения проекта')
    }
  }

  const handleDelete = async (id: number) => {
    console.log('[ProjectsTab.handleDelete] Deleting project:', id)
    Modal.confirm({
      title: 'Удалить проект?',
      content: 'Это действие нельзя отменить',
      okText: 'Удалить',
      cancelText: 'Отмена',
      okType: 'danger',
      onOk: async () => {
        try {
          const { error } = await supabase
            .from('projects')
            .delete()
            .eq('id', id)

          if (error) throw error
          message.success('Проект удален')
          loadProjects()
        } catch (error) {
          console.error('[ProjectsTab.handleDelete] Error:', error)
          message.error('Ошибка удаления проекта')
        }
      }
    })
  }

  const columns: ColumnsType<Project> = [
    {
      title: 'Код',
      dataIndex: 'code',
      key: 'code',
      width: 100
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
      title: 'Активен',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 80,
      render: (active) => (active ? 'Да' : 'Нет')
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
          Добавить проект
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={projects}
        loading={loading}
        rowKey="id"
        pagination={{
          pageSize: 10,
          showTotal: (total) => `Всего: ${total} проектов`
        }}
      />

      <Modal
        title={editingProject ? 'Редактировать проект' : 'Создать проект'}
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            name="code"
            label="Код проекта"
            rules={[{ max: 50, message: 'Максимум 50 символов' }]}
          >
            <Input placeholder="Например: PROJ-001" />
          </Form.Item>

          <Form.Item
            name="name"
            label="Название"
            rules={[{ required: true, message: 'Введите название проекта' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item name="description" label="Описание">
            <Input.TextArea rows={4} />
          </Form.Item>

          <Form.Item
            name="is_active"
            label="Активен"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setIsModalVisible(false)}>
                Отмена
              </Button>
              <Button type="primary" htmlType="submit">
                {editingProject ? 'Обновить' : 'Создать'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}