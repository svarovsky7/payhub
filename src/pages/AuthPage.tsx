import { useState, useEffect } from 'react'
import { Form, Input, Button, Card, Tabs, message, Select } from 'antd'
import { UserOutlined, LockOutlined, MailOutlined, ProjectOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase, type Project } from '../lib/supabase'

export const AuthPage = () => {
  const [loading, setLoading] = useState(false)
  const [projects, setProjects] = useState<Project[]>([])
  const navigate = useNavigate()
  const { signIn, signUp } = useAuth()

  useEffect(() => {
    loadProjects()
  }, [])

  const loadProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('is_active', true)
        .order('name')

      if (error) throw error
      setProjects(data || [])
    } catch (error) {
      console.error('[AuthPage.loadProjects] Error:', error)
    }
  }

  const handleLogin = async (values: { email: string; password: string }) => {
    setLoading(true)
    try {
      await signIn(values.email, values.password)
      message.success('Вход выполнен успешно!')
      navigate('/invoices')
    } catch (error: any) {
      console.error('[AuthPage.handleLogin] Login error:', error)
      message.error(error.message || 'Ошибка входа')
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (values: {
    email: string;
    fullName: string;
    password: string;
    projectIds: number[]
  }) => {
    setLoading(true)
    try {
      // Регистрируем пользователя
      await signUp(values.email, values.password, values.fullName)

      // Получаем ID нового пользователя
      const { data: { user } } = await supabase.auth.getUser()

      if (user && values.projectIds && values.projectIds.length > 0) {
        // Добавляем проекты пользователю
        const userProjects = values.projectIds.map(projectId => ({
          user_id: user.id,
          project_id: projectId
        }))

        const { error: projectError } = await supabase
          .from('user_projects')
          .insert(userProjects)

        if (projectError) {
          console.error('[AuthPage.handleRegister] Error assigning projects:', projectError)
        }
      }

      message.success('Регистрация успешна! Проверьте почту для подтверждения.')
      navigate('/invoices')
    } catch (error: any) {
      console.error('[AuthPage.handleRegister] Registration error:', error)
      message.error(error.message || 'Ошибка регистрации')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    }}>
      <Card style={{ width: 450 }}>
        <Tabs defaultActiveKey="login">
          <Tabs.TabPane tab="Вход" key="login">
            <Form
              name="login"
              onFinish={handleLogin}
              autoComplete="off"
              layout="vertical"
            >
              <Form.Item
                name="email"
                rules={[
                  { required: true, message: 'Введите email!' },
                  { type: 'email', message: 'Неверный формат email!' }
                ]}
              >
                <Input
                  prefix={<MailOutlined />}
                  placeholder="Email"
                  size="large"
                />
              </Form.Item>

              <Form.Item
                name="password"
                rules={[{ required: true, message: 'Введите пароль!' }]}
              >
                <Input.Password
                  prefix={<LockOutlined />}
                  placeholder="Пароль"
                  size="large"
                />
              </Form.Item>

              <Form.Item>
                <Button type="primary" htmlType="submit" loading={loading} block size="large">
                  Войти
                </Button>
              </Form.Item>
            </Form>
          </Tabs.TabPane>

          <Tabs.TabPane tab="Регистрация" key="register">
            <Form
              name="register"
              onFinish={handleRegister}
              autoComplete="off"
              layout="vertical"
            >
              <Form.Item
                name="email"
                rules={[
                  { required: true, message: 'Введите email!' },
                  { type: 'email', message: 'Неверный формат email!' }
                ]}
              >
                <Input
                  prefix={<MailOutlined />}
                  placeholder="Email"
                  size="large"
                />
              </Form.Item>

              <Form.Item
                name="fullName"
                rules={[{ required: true, message: 'Введите ФИО!' }]}
              >
                <Input
                  prefix={<UserOutlined />}
                  placeholder="ФИО"
                  size="large"
                />
              </Form.Item>

              <Form.Item
                name="password"
                rules={[{ required: true, message: 'Введите пароль!' }]}
              >
                <Input.Password
                  prefix={<LockOutlined />}
                  placeholder="Пароль"
                  size="large"
                />
              </Form.Item>

              <Form.Item
                name="projectIds"
                rules={[{ required: true, message: 'Выберите хотя бы один проект!' }]}
              >
                <Select
                  mode="multiple"
                  placeholder="Выберите проекты"
                  size="large"
                  suffixIcon={<ProjectOutlined />}
                  options={projects.map(p => ({
                    label: p.name,
                    value: p.id
                  }))}
                />
              </Form.Item>

              <Form.Item>
                <Button type="primary" htmlType="submit" loading={loading} block size="large">
                  Зарегистрироваться
                </Button>
              </Form.Item>
            </Form>
          </Tabs.TabPane>
        </Tabs>
      </Card>
    </div>
  )
}