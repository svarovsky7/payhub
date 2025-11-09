import { useState, useEffect } from 'react'
import { Form, Input, Button, Select, Card, message } from 'antd'
import { KeyOutlined } from '@ant-design/icons'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

interface Project {
  id: number
  name: string
  code: string
}

interface Role {
  id: number
  name: string
  code: string
}

export const ProfilePage = () => {
  const { user, userProfile } = useAuth()
  const [form] = Form.useForm()
  const [passwordForm] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [projects, setProjects] = useState<Project[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [userProjects, setUserProjects] = useState<number[]>([])

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      // Load projects
      const { data: projectsData } = await supabase
        .from('projects')
        .select('*')
        .order('name')
      setProjects(projectsData || [])

      // Load roles
      const { data: rolesData } = await supabase
        .from('roles')
        .select('*')
        .order('name')
      setRoles(rolesData || [])

      // Load user projects
      let loadedUserProjects: number[] = []
      if (user?.id) {
        const { data: userProjectsData } = await supabase
          .from('user_projects')
          .select('project_id')
          .eq('user_id', user.id)
        loadedUserProjects = userProjectsData?.map(up => up.project_id) || []
        setUserProjects(loadedUserProjects)
      }

      // Set form values
      form.setFieldsValue({
        full_name: userProfile?.full_name,
        email: userProfile?.email,
        role_id: userProfile?.role_id,
        project_ids: loadedUserProjects,
      })
    } catch (error) {
      console.error('Error loading data:', error)
      message.error('Ошибка загрузки данных')
    }
  }

  const handleUpdateProfile = async (values: any) => {
    if (!user?.id) return

    setLoading(true)
    try {
      // Update profile
      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({
          full_name: values.full_name,
          role_id: values.role_id,
        })
        .eq('id', user.id)

      if (profileError) throw profileError

      // Update projects
      await supabase
        .from('user_projects')
        .delete()
        .eq('user_id', user.id)

      if (values.project_ids?.length > 0) {
        const { error: projectsError } = await supabase
          .from('user_projects')
          .insert(values.project_ids.map((pid: number) => ({
            user_id: user.id,
            project_id: pid,
          })))

        if (projectsError) throw projectsError
      }

      message.success('Профиль обновлен')
      window.location.reload()
    } catch (error: any) {
      console.error('Error updating profile:', error)
      message.error(error.message || 'Ошибка обновления профиля')
    } finally {
      setLoading(false)
    }
  }

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*'
    let password = ''
    for (let i = 0; i < 16; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    passwordForm.setFieldsValue({
      new_password: password,
      confirm_password: password,
    })
    message.success('Пароль сгенерирован')
  }

  const handleChangePassword = async (values: any) => {
    if (values.new_password !== values.confirm_password) {
      message.error('Пароли не совпадают')
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({
        password: values.new_password,
      })

      if (error) throw error

      message.success('Пароль изменен')
      passwordForm.resetFields()
    } catch (error: any) {
      console.error('Error changing password:', error)
      message.error(error.message || 'Ошибка изменения пароля')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <h1>Профиль пользователя</h1>

      <Card title="Основная информация" style={{ marginBottom: 24 }}>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleUpdateProfile}
          initialValues={{
            full_name: userProfile?.full_name,
            email: userProfile?.email,
            role_id: userProfile?.role_id,
            project_ids: userProjects,
          }}
        >
          <Form.Item label="Email" name="email">
            <Input disabled />
          </Form.Item>

          <Form.Item
            label="ФИО"
            name="full_name"
            rules={[{ required: true, message: 'Введите ФИО' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            label="Роль"
            name="role_id"
            rules={[{ required: true, message: 'Выберите роль' }]}
          >
            <Select
              options={roles.map(r => ({ label: r.name, value: r.id }))}
              placeholder="Выберите роль"
            />
          </Form.Item>

          <Form.Item
            label="Проекты"
            name="project_ids"
            rules={[{ required: true, message: 'Выберите хотя бы один проект' }]}
          >
            <Select
              mode="multiple"
              options={projects.map(p => ({ label: `${p.code} - ${p.name}`, value: p.id }))}
              placeholder="Выберите проекты"
            />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading}>
              Сохранить изменения
            </Button>
          </Form.Item>
        </Form>
      </Card>

      <Card title="Смена пароля">
        <Form
          form={passwordForm}
          layout="vertical"
          onFinish={handleChangePassword}
        >
          <Form.Item label="Новый пароль">
            <Form.Item
              name="new_password"
              noStyle
              rules={[
                { required: true, message: 'Введите новый пароль' },
                { min: 6, message: 'Минимум 6 символов' },
              ]}
            >
              <Input.Password style={{ width: 'calc(100% - 200px)', marginRight: 8 }} />
            </Form.Item>
            <Button icon={<KeyOutlined />} onClick={generatePassword}>
              Сгенерировать
            </Button>
          </Form.Item>

          <Form.Item
            label="Подтвердите пароль"
            name="confirm_password"
            rules={[
              { required: true, message: 'Подтвердите пароль' },
            ]}
          >
            <Input.Password />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading}>
              Изменить пароль
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}

