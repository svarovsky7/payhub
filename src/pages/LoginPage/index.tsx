import React, { useEffect } from 'react';
import { Form, Input, Button, Card, Typography, message } from 'antd';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useAuthStore } from '@/shared/store';
import type { LoginCredentials } from '@/shared/types';

const { Title, Text } = Typography;

export const LoginPage: React.FC = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, user, loading } = useAuthStore();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const from = (location.state as { from?: { pathname?: string } })?.from?.pathname || '/material-requests';

  useEffect(() => {
    if (user && !loading) {
      navigate(from, { replace: true });
    }
  }, [user, loading, navigate, from]);

  const handleSubmit = async (values: LoginCredentials) => {
    setIsSubmitting(true);
    try {
      const { error } = await signIn(values);
      if (error) {
        message.error(error);
      } else {
        message.success('Вход выполнен успешно!');
        navigate(from, { replace: true });
      }
    } catch {
      message.error('Произошла непредвиденная ошибка');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return null; // Let the auth initialization complete
  }

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        backgroundColor: '#f0f2f5',
        padding: '20px',
      }}
    >
      <Card
        style={{
          width: '100%',
          maxWidth: 400,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Title level={2} style={{ marginBottom: 8 }}>
            PayHub
          </Title>
          <Text type="secondary">Войдите в ваш аккаунт</Text>
        </div>

        <Form
          form={form}
          name="login"
          onFinish={handleSubmit}
          layout="vertical"
          requiredMark={false}
        >
          <Form.Item
            name="email"
            label="Электронная почта"
            rules={[
              { required: true, message: 'Пожалуйста, введите email!' },
              { type: 'email', message: 'Пожалуйста, введите корректный email!' },
            ]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="Электронная почта"
              size="large"
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
              placeholder="Пароль"
              size="large"
              autoComplete="current-password"
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              block
              loading={isSubmitting}
            >
              Войти
            </Button>
          </Form.Item>

          <div style={{ textAlign: 'center' }}>
            <Text type="secondary">
              Нет аккаунта?{' '}
              <Link to="/register">Зарегистрируйтесь</Link>
            </Text>
          </div>
        </Form>
      </Card>
    </div>
  );
};