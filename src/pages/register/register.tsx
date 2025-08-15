import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Card,
  Form,
  Input,
  Button,
  Typography,
  Space,
  Alert,
  Row,
  Col,
} from 'antd';
import { UserOutlined, MailOutlined, LockOutlined } from '@ant-design/icons';
import { useAuthStore } from '@/features/auth/model/auth-store';

const { Title, Text } = Typography;

interface RegisterFormData {
  email: string;
  password: string;
  confirmPassword: string;
  full_name: string;
  project_id: number;
}

export function RegisterPage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { signUp } = useAuthStore();

  const handleSubmit = async (values: RegisterFormData) => {
    try {
      setLoading(true);
      setError(null);

      await signUp(values.email, values.password, values.full_name);

      // Navigate to login page with success message
      navigate('/login', { 
        state: { 
          message: 'Регистрация успешна! Проверьте вашу почту для подтверждения аккаунта, затем войдите в систему.' 
        } 
      });

    } catch (error: unknown) {
      console.error('Registration failed:', error);
      setError((error as Error)?.message || 'Ошибка регистрации. Пожалуйста, попробуйте еще раз.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px',
    }}>
      <Card
        style={{
          width: '100%',
          maxWidth: 450,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Title level={2} style={{ color: '#1677ff', marginBottom: 8 }}>
            PayHub
          </Title>
          <Text type="secondary">
            Create your account to get started
          </Text>
        </div>

        {error && (
          <Alert
            message="Registration Failed"
            description={error}
            type="error"
            showIcon
            style={{ marginBottom: 24 }}
          />
        )}

        <Form
          form={form}
          name="register"
          onFinish={handleSubmit}
          layout="vertical"
          size="large"
        >
          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'Please enter your email' },
              { type: 'email', message: 'Please enter a valid email' },
            ]}
          >
            <Input
              prefix={<MailOutlined />}
              placeholder="Enter your email"
            />
          </Form.Item>

          <Form.Item
            name="full_name"
            label="Full Name (ФИО)"
            rules={[
              { required: true, message: 'Please enter your full name' },
              { min: 2, message: 'Name must be at least 2 characters' },
            ]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="Введите ваше ФИО"
            />
          </Form.Item>

          <Form.Item
            name="password"
            label="Password"
            rules={[
              { required: true, message: 'Please enter your password' },
              { min: 6, message: 'Password must be at least 6 characters' },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Enter your password"
            />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            label="Подтвердите пароль"
            dependencies={['password']}
            rules={[
              { required: true, message: 'Пожалуйста, подтвердите пароль' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('Пароли не совпадают'));
                },
              }),
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Повторите пароль"
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 16 }}>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
              style={{ height: 48 }}
            >
              Register
            </Button>
          </Form.Item>

          <Row justify="center">
            <Col>
              <Space>
                <Text type="secondary">Already have an account?</Text>
                <Link to="/login">
                  <Button type="link" style={{ padding: 0 }}>
                    Login here
                  </Button>
                </Link>
              </Space>
            </Col>
          </Row>
        </Form>
      </Card>
    </div>
  );
}