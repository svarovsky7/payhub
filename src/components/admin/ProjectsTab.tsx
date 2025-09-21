import { useState, useEffect } from 'react'
import { Table, Space, Button, Modal, Form, Input, Switch, message, Popconfirm } from 'antd'
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

  const handleDeleteWithPopconfirm = async (id: number) => {
    console.log('[ProjectsTab.handleDeleteWithPopconfirm] Starting deletion for project:', id)

    if (!id) {
      console.error('[ProjectsTab.handleDeleteWithPopconfirm] Error: Project ID is undefined or null')
      message.error('Ошибка: ID проекта не определен')
      return
    }

    try {
      // Сначала проверим, есть ли связи с пользователями
      console.log('[ProjectsTab.handleDeleteWithPopconfirm] Checking user associations for project:', id)
      const { data: associations, error: checkError } = await supabase
        .from('user_projects')
        .select('*')
        .eq('project_id', id)

      console.log('[ProjectsTab.handleDeleteWithPopconfirm] Found associations:', associations)

      if (checkError) {
        console.error('[ProjectsTab.handleDeleteWithPopconfirm] Error checking associations:', checkError)
      }

      // Удаляем все связи пользователей с этим проектом
      if (associations && associations.length > 0) {
        console.log('[ProjectsTab.handleDeleteWithPopconfirm] Removing user associations for project:', id)
        const { data: deleteData, error: userProjectsError } = await supabase
          .from('user_projects')
          .delete()
          .eq('project_id', id)
          .select()

        console.log('[ProjectsTab.handleDeleteWithPopconfirm] Deleted associations:', deleteData)

        if (userProjectsError) {
          console.error('[ProjectsTab.handleDeleteWithPopconfirm] Error removing user associations:', userProjectsError)
          throw userProjectsError
        }
      }

      // Теперь удаляем сам проект
      console.log('[ProjectsTab.handleDeleteWithPopconfirm] Removing project:', id)
      const { data: deletedProject, error: projectError } = await supabase
        .from('projects')
        .delete()
        .eq('id', id)
        .select()

      console.log('[ProjectsTab.handleDeleteWithPopconfirm] Deleted project result:', deletedProject)

      if (projectError) {
        console.error('[ProjectsTab.handleDeleteWithPopconfirm] Error removing project:', projectError)
        throw projectError
      }

      if (!deletedProject || deletedProject.length === 0) {
        console.log('[ProjectsTab.handleDeleteWithPopconfirm] Warning: No project was deleted')
        throw new Error('Проект не был удален. Возможно, у вас нет прав на удаление.')
      }

      console.log('[ProjectsTab.handleDeleteWithPopconfirm] Project successfully deleted, reloading projects list')
      message.success('Проект удален')
      await loadProjects()
    } catch (error: any) {
      console.error('[ProjectsTab.handleDeleteWithPopconfirm] Full error object:', error)
      message.error(error.message || 'Ошибка удаления проекта')
    }
  }

  const handleDelete = async (id: number) => {
    console.log('[ProjectsTab.handleDelete] Starting delete process for project:', id)

    // Добавляем проверку, что id существует
    if (!id) {
      console.error('[ProjectsTab.handleDelete] Error: Project ID is undefined or null')
      message.error('Ошибка: ID проекта не определен')
      return
    }

    console.log('[ProjectsTab.handleDelete] Creating confirmation modal')

    Modal.confirm({
      title: 'Удалить проект?',
      content: 'Это действие нельзя отменить. Все пользователи будут отвязаны от этого проекта.',
      okText: 'Удалить',
      cancelText: 'Отмена',
      okType: 'danger',
      onCancel: () => {
        console.log('[ProjectsTab.handleDelete.onCancel] User cancelled deletion of project:', id)
      },
      onOk: async () => {
        console.log('[ProjectsTab.handleDelete.onOk] User confirmed deletion of project:', id)
        try {
          // Сначала проверим, есть ли связи с пользователями
          console.log('[ProjectsTab.handleDelete] Checking user associations for project:', id)
          const { data: associations, error: checkError } = await supabase
            .from('user_projects')
            .select('*')
            .eq('project_id', id)

          console.log('[ProjectsTab.handleDelete] Found associations:', associations)

          if (checkError) {
            console.error('[ProjectsTab.handleDelete] Error checking associations:', checkError)
          }

          // Удаляем все связи пользователей с этим проектом
          if (associations && associations.length > 0) {
            console.log('[ProjectsTab.handleDelete] Removing user associations for project:', id)
            const { data: deleteData, error: userProjectsError } = await supabase
              .from('user_projects')
              .delete()
              .eq('project_id', id)
              .select()

            console.log('[ProjectsTab.handleDelete] Deleted associations:', deleteData)

            if (userProjectsError) {
              console.error('[ProjectsTab.handleDelete] Error removing user associations:', userProjectsError)
              throw userProjectsError
            }
          }

          // Теперь удаляем сам проект
          console.log('[ProjectsTab.handleDelete] Removing project:', id)
          const { data: deletedProject, error: projectError } = await supabase
            .from('projects')
            .delete()
            .eq('id', id)
            .select()

          console.log('[ProjectsTab.handleDelete] Deleted project result:', deletedProject)

          if (projectError) {
            console.error('[ProjectsTab.handleDelete] Error removing project:', projectError)
            throw projectError
          }

          if (!deletedProject || deletedProject.length === 0) {
            console.log('[ProjectsTab.handleDelete] Warning: No project was deleted')
            throw new Error('Проект не был удален. Возможно, у вас нет прав на удаление.')
          }

          console.log('[ProjectsTab.handleDelete] Project successfully deleted, reloading projects list')
          message.success('Проект удален')
          await loadProjects()
        } catch (error: any) {
          console.error('[ProjectsTab.handleDelete] Full error object:', error)

          // Если обычное удаление не сработало, пробуем через RPC функцию
          console.log('[ProjectsTab.handleDelete] Trying RPC function delete')
          try {
            const { data: rpcResult, error: rpcError } = await supabase
              .rpc('delete_project', { project_id_param: id })

            if (rpcError) {
              console.error('[ProjectsTab.handleDelete] RPC error:', rpcError)
              throw rpcError
            }

            console.log('[ProjectsTab.handleDelete] RPC result:', rpcResult)

            if (rpcResult) {
              message.success('Проект удален через RPC')
              loadProjects()
              return
            }
          } catch (rpcErr) {
            console.error('[ProjectsTab.handleDelete] RPC also failed:', rpcErr)
          }

          message.error(error.message || 'Ошибка удаления проекта')
        }
      }
    })

    console.log('[ProjectsTab.handleDelete] Modal.confirm called, waiting for user action')
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
          <Popconfirm
            title="Удалить проект?"
            description="Это действие нельзя отменить. Все пользователи будут отвязаны от этого проекта."
            onConfirm={() => {
              console.log('[ProjectsTab.Popconfirm.onConfirm] User confirmed deletion for project:', record.id)
              handleDeleteWithPopconfirm(record.id)
            }}
            onCancel={() => {
              console.log('[ProjectsTab.Popconfirm.onCancel] User cancelled deletion for project:', record.id)
            }}
            okText="Удалить"
            cancelText="Отмена"
            okButtonProps={{ danger: true }}
          >
            <Button
              icon={<DeleteOutlined />}
              size="small"
              danger
              onClick={() => {
                console.log('[ProjectsTab.Button.onClick] Delete button clicked for record:', record)
                console.log('[ProjectsTab.Button.onClick] Project ID:', record.id)
              }}
            />
          </Popconfirm>
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