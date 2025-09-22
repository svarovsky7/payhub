import { useState, useEffect } from 'react'
import { Table, Space, Button, Modal, Form, Input, Select, message, Tag } from 'antd'
import { EditOutlined, DeleteOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { supabase, type UserProfile, type Project } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

interface Role {
  id: number
  code: string
  name: string
}

interface UserWithProjects extends UserProfile {
  projects?: number[]
  role?: Role
  role_id?: number
}

export const UsersTab = () => {
  const [users, setUsers] = useState<UserWithProjects[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(false)
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [editingUser, setEditingUser] = useState<UserWithProjects | null>(null)
  const [form] = Form.useForm()
  const { user: currentUser, currentRoleId } = useAuth()

  useEffect(() => {
    loadUsers()
    loadProjects()
    loadRoles()
  }, [])

  // Обновляем список пользователей при изменении роли текущего пользователя
  useEffect(() => {
    if (currentUser) {
      console.log('[UsersTab] Current user role changed, reloading users')
      loadUsers()
    }
  }, [currentRoleId])

  const loadRoles = async () => {
    console.log('[UsersTab.loadRoles] Loading roles')
    try {
      const { data, error } = await supabase
        .from('roles')
        .select('*')
        .order('name')

      if (error) throw error
      setRoles(data || [])
    } catch (error) {
      console.error('[UsersTab.loadRoles] Error:', error)
    }
  }

  const loadProjects = async () => {
    console.log('[UsersTab.loadProjects] Loading projects')
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('is_active', true)
        .order('name')

      if (error) throw error
      setProjects(data || [])
    } catch (error) {
      console.error('[UsersTab.loadProjects] Error:', error)
    }
  }

  const loadUsers = async () => {
    console.log('[UsersTab.loadUsers] Loading users')
    setLoading(true)
    try {
      // Загружаем пользователей с ролями
      const { data: usersData, error: usersError } = await supabase
        .from('user_profiles')
        .select(`
          *,
          role:roles(*)
        `)
        .order('created_at', { ascending: false })

      if (usersError) throw usersError

      // Загружаем проекты пользователей
      const { data: userProjectsData, error: userProjectsError } = await supabase
        .from('user_projects')
        .select('user_id, project_id')

      if (userProjectsError) throw userProjectsError

      // Объединяем данные
      const usersWithProjects = (usersData || []).map(user => {
        const userProjects = userProjectsData
          ?.filter(up => up.user_id === user.id)
          ?.map(up => up.project_id) || []

        return {
          ...user,
          projects: userProjects
        }
      })

      console.log('[UsersTab.loadUsers] Loaded users with projects:', usersWithProjects.length)
      setUsers(usersWithProjects)
    } catch (error) {
      console.error('[UsersTab.loadUsers] Error:', error)
      message.error('Ошибка загрузки пользователей')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (record: UserWithProjects) => {
    console.log('[UsersTab.handleEdit] Editing user:', record.id)
    setEditingUser(record)
    form.setFieldsValue({
      ...record,
      projectIds: record.projects || [],
      role_id: record.role_id || null
    })
    setIsModalVisible(true)
  }

  const handleSubmit = async (values: any) => {
    if (!editingUser) return

    console.log('[UsersTab.handleSubmit] Updating user:', editingUser.id, values)
    try {
      // Обновляем профиль пользователя
      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({
          full_name: values.full_name,
          email: values.email,
          role_id: values.role_id || null
        })
        .eq('id', editingUser.id)

      if (profileError) throw profileError

      // Удаляем старые проекты
      const { error: deleteError } = await supabase
        .from('user_projects')
        .delete()
        .eq('user_id', editingUser.id)

      if (deleteError) throw deleteError

      // Добавляем новые проекты
      if (values.projectIds && values.projectIds.length > 0) {
        const userProjects = values.projectIds.map((projectId: number) => ({
          user_id: editingUser.id,
          project_id: projectId
        }))

        const { error: insertError } = await supabase
          .from('user_projects')
          .insert(userProjects)

        if (insertError) throw insertError
      }

      message.success('Пользователь обновлен')
      setIsModalVisible(false)
      loadUsers()
    } catch (error) {
      console.error('[UsersTab.handleSubmit] Error:', error)
      message.error('Ошибка обновления пользователя')
    }
  }

  const handleDelete = async (id: string) => {
    console.log('[UsersTab.handleDelete] Deleting user:', id)
    Modal.confirm({
      title: 'Удалить пользователя?',
      content: 'Это действие нельзя отменить. Будут удалены все связанные данные.',
      okText: 'Удалить',
      cancelText: 'Отмена',
      okType: 'danger',
      onOk: async () => {
        try {
          // Удаляем проекты пользователя
          await supabase
            .from('user_projects')
            .delete()
            .eq('user_id', id)

          // Удаляем профиль пользователя
          const { error } = await supabase
            .from('user_profiles')
            .delete()
            .eq('id', id)

          if (error) throw error

          message.success('Пользователь удален')
          loadUsers()
        } catch (error) {
          console.error('[UsersTab.handleDelete] Error:', error)
          message.error('Ошибка удаления пользователя')
        }
      }
    })
  }

  const getProjectNames = (projectIds?: number[]) => {
    if (!projectIds || projectIds.length === 0) return '-'

    return projectIds
      .map(id => {
        const project = projects.find(p => p.id === id)
        return project ? <Tag key={id}>{project.name}</Tag> : null
      })
      .filter(Boolean)
  }

  const columns: ColumnsType<UserWithProjects> = [
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email'
    },
    {
      title: 'ФИО',
      dataIndex: 'full_name',
      key: 'full_name'
    },
    {
      title: 'Роль',
      key: 'role',
      render: (_, record) => {
        if (record.role) {
          return <Tag color="blue">{record.role.name}</Tag>
        }
        return <Tag>Без роли</Tag>
      }
    },
    {
      title: 'Проекты',
      dataIndex: 'projects',
      key: 'projects',
      render: (projectIds) => getProjectNames(projectIds)
    },
    {
      title: 'Дата регистрации',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date) => new Date(date).toLocaleDateString('ru-RU')
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
      <Table
        columns={columns}
        dataSource={users}
        loading={loading}
        rowKey="id"
        pagination={{
          pageSize: 10,
          showTotal: (total) => `Всего: ${total} пользователей`
        }}
      />

      <Modal
        title="Редактировать пользователя"
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
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'Введите email' },
              { type: 'email', message: 'Неверный формат email' }
            ]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="full_name"
            label="ФИО"
            rules={[{ required: true, message: 'Введите ФИО' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="role_id"
            label="Роль"
          >
            <Select
              placeholder="Выберите роль"
              allowClear
              options={[
                { value: null, label: 'Без роли' },
                ...roles.map(role => ({
                  label: role.name,
                  value: role.id
                }))
              ]}
            />
          </Form.Item>

          <Form.Item
            name="projectIds"
            label="Проекты"
            rules={[{ required: true, message: 'Выберите хотя бы один проект' }]}
          >
            <Select
              mode="multiple"
              placeholder="Выберите проекты"
              options={projects.map(p => ({
                label: p.name,
                value: p.id
              }))}
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setIsModalVisible(false)}>
                Отмена
              </Button>
              <Button type="primary" htmlType="submit">
                Обновить
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}