import { useState, useEffect } from 'react'
import { Card, Tabs, Form, Input, Button, Select, Typography } from 'antd'
import { UserOutlined, LockOutlined, TeamOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import type { Project } from '../lib/supabase'

const { Title } = Typography

export function AuthPage() {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login')
  const [loginForm] = Form.useForm()
  const [registerForm] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [projects, setProjects] = useState<Project[]>([])
  const navigate = useNavigate()
  const { signIn, signUp, user } = useAuth()

  console.log('[AuthPage] Rendering, user:', user?.email || 'none')

  useEffect(() => {
    // Redirect if already logged in
    if (user) {
      console.log('[AuthPage.useEffect] User already logged in, redirecting...')
      navigate('/invoices')
    }
  }, [user, navigate])

  useEffect(() => {
    // Load projects for registration form
    loadProjects()
  }, [])

  const loadProjects = async () => {
    console.log('[AuthPage.loadProjects] Loading projects...')
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('is_active', true)
        .order('name')

      if (error) throw error

      console.log('[AuthPage.loadProjects] Loaded projects:', data?.length || 0)
      setProjects(data || [])
    } catch (error) {
      console.error('[AuthPage.loadProjects] Error:', error)
    }
  }

  const handleLogin = async (values: { email: string; password: string }) => {
    console.log('[AuthPage.handleLogin] Attempting login:', values.email)
    setLoading(true)
    try {
      await signIn(values.email, values.password)
      navigate('/invoices')
    } catch (error) {
      console.error('[AuthPage.handleLogin] Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (values: {
    email: string
    password: string
    fullName: string
    projectIds: number[]
  }) => {
    console.log('[AuthPage.handleRegister] Attempting registration:', values.email)
    setLoading(true)
    try {
      await signUp(values.email, values.password, values.fullName, values.projectIds || [])
      // Don't reset form or switch tabs - user is now authenticated and will be redirected
      // The useEffect will handle the redirect to the portal
    } catch (error) {
      console.error('[AuthPage.handleRegister] Error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '20px',
      }}
    >
      <Card
        style={{
          width: '100%',
          maxWidth: 500,
          boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Title level={2} style={{ marginBottom: 8 }}>
            PayHub
          </Title>
          <Typography.Text type="secondary">
            Система управления счетами и платежами
          </Typography.Text>
        </div>

        <Tabs
          activeKey={activeTab}
          onChange={(key) => setActiveTab(key as 'login' | 'register')}
          items={[
            {
              key: 'login',
              label: 'Вход',
              children: (
                <Form
                  form={loginForm}
                  name="login"
                  onFinish={handleLogin}
                  layout="vertical"
                  size="large"
                >
                  <Form.Item
                    name="email"
                    label="Email"
                    rules={[
                      { required: true, message: 'Введите email' },
                      { type: 'email', message: 'Некорректный email' },
                    ]}
                  >
                    <Input
                      prefix={<UserOutlined />}
                      placeholder="user@example.com"
                      autoComplete="email"
                    />
                  </Form.Item>

                  <Form.Item
                    name="password"
                    label="Пароль"
                    rules={[{ required: true, message: 'Введите пароль' }]}
                  >
                    <Input.Password
                      prefix={<LockOutlined />}
                      placeholder="Пароль"
                      autoComplete="current-password"
                    />
                  </Form.Item>

                  <Form.Item style={{ marginBottom: 0 }}>
                    <Button
                      type="primary"
                      htmlType="submit"
                      loading={loading}
                      block
                    >
                      Войти
                    </Button>
                  </Form.Item>
                </Form>
              ),
            },
            {
              key: 'register',
              label: 'Регистрация',
              children: (
                <Form
                  form={registerForm}
                  name="register"
                  onFinish={handleRegister}
                  layout="vertical"
                  size="large"
                >
                  <Form.Item
                    name="email"
                    label="Email"
                    rules={[
                      { required: true, message: 'Введите email' },
                      { type: 'email', message: 'Некорректный email' },
                    ]}
                  >
                    <Input
                      prefix={<UserOutlined />}
                      placeholder="user@example.com"
                      autoComplete="email"
                    />
                  </Form.Item>

                  <Form.Item
                    name="fullName"
                    label="ФИО"
                    rules={[
                      { required: true, message: 'Введите ФИО' },
                      { min: 3, message: 'ФИО должно содержать минимум 3 символа' },
                    ]}
                  >
                    <Input
                      prefix={<TeamOutlined />}
                      placeholder="Иванов Иван Иванович"
                      autoComplete="name"
                    />
                  </Form.Item>

                  <Form.Item
                    name="password"
                    label="Пароль"
                    rules={[
                      { required: true, message: 'Введите пароль' },
                      { min: 6, message: 'Пароль должен содержать минимум 6 символов' },
                    ]}
                  >
                    <Input.Password
                      prefix={<LockOutlined />}
                      placeholder="Пароль"
                      autoComplete="new-password"
                    />
                  </Form.Item>

                  <Form.Item
                    name="confirmPassword"
                    label="Подтверждение пароля"
                    dependencies={['password']}
                    rules={[
                      { required: true, message: 'Подтвердите пароль' },
                      ({ getFieldValue }) => ({
                        validator(_, value) {
                          if (!value || getFieldValue('password') === value) {
                            return Promise.resolve()
                          }
                          return Promise.reject(new Error('Пароли не совпадают'))
                        },
                      }),
                    ]}
                  >
                    <Input.Password
                      prefix={<LockOutlined />}
                      placeholder="Подтвердите пароль"
                      autoComplete="new-password"
                    />
                  </Form.Item>

                  <Form.Item
                    name="projectIds"
                    label="Проекты"
                    tooltip="Выберите проекты, к которым принадлежит пользователь"
                  >
                    <Select
                      mode="multiple"
                      placeholder="Выберите проекты"
                      options={projects.map((project) => ({
                        label: project.code ? `${project.code} - ${project.name}` : project.name,
                        value: project.id,
                      }))}
                      showSearch
                      optionFilterProp="label"
                      maxTagCount="responsive"
                    />
                  </Form.Item>

                  <Form.Item style={{ marginBottom: 0 }}>
                    <Button
                      type="primary"
                      htmlType="submit"
                      loading={loading}
                      block
                    >
                      Зарегистрироваться
                    </Button>
                  </Form.Item>
                </Form>
              ),
            },
          ]}
        />
      </Card>
    </div>
  )
}
