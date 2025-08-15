import { useState, useEffect } from 'react';
import { Form, Input, Button, Card, Typography, Alert, Space, Row, Col } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useAuthStore } from '@/features/auth/model/auth-store';
import { useNavigate, useLocation, Link } from 'react-router-dom';

const { Title, Text } = Typography;

interface LoginFormValues {
  email: string;
  password: string;
}

export function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const signIn = useAuthStore((state) => state.signIn);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Check for success message from registration
    if (location.state?.message) {
      setSuccessMessage(location.state.message);
    }
  }, [location.state]);

  const handleSubmit = async (values: LoginFormValues) => {
    try {
      setLoading(true);
      setError(null);
      await signIn(values.email, values.password);
      navigate('/invoices');
    } catch (error: unknown) {
      const errorMessage = (error as { message?: string })?.message || 'Ошибка входа';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px'
    }}>
      <Card style={{ 
        width: '100%',
        maxWidth: 400,
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Title level={2} style={{ color: '#1677ff', marginBottom: 8 }}>
            PayHub
          </Title>
          <Text type="secondary">
            Войдите в свой аккаунт
          </Text>
        </div>
        
        {successMessage && (
          <Alert
            message="Регистрация успешна"
            description={successMessage}
            type="success"
            showIcon
            style={{ marginBottom: 24 }}
            closable
            onClose={() => setSuccessMessage(null)}
          />
        )}

        {error && (
          <Alert
            message="Ошибка входа"
            description={error}
            type="error"
            showIcon
            style={{ marginBottom: 24 }}
            closable
            onClose={() => setError(null)}
          />
        )}

        <Form
          name="login"
          onFinish={handleSubmit}
          layout="vertical"
          size="large"
          autoComplete="off"
        >
          <Form.Item
            name="email"
            label="Электронная почта"
            rules={[
              { required: true, message: 'Пожалуйста, введите ваш email!' },
              { type: 'email', message: 'Пожалуйста, введите корректный email!' },
            ]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="Введите ваш email"
              autoComplete="email"
            />
          </Form.Item>

          <Form.Item
            name="password"
            label="Пароль"
            rules={[{ required: true, message: 'Пожалуйста, введите пароль!' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Введите пароль"
              autoComplete="current-password"
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 16 }}>
            <Button
              type="primary"
              htmlType="submit"
              block
              loading={loading}
              style={{ height: 48 }}
            >
              Войти
            </Button>
          </Form.Item>

          <Row justify="center">
            <Col>
              <Space>
                <Text type="secondary">Нет аккаунта?</Text>
                <Link to="/register">
                  <Button type="link" style={{ padding: 0 }}>
                    Зарегистрироваться
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