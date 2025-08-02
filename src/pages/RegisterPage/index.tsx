import React, { useEffect } from 'react';
import { Form, Input, Button, Card, Typography, Select, message } from 'antd';
import { Link, useNavigate } from 'react-router-dom';
import { UserOutlined, LockOutlined, MailOutlined, TeamOutlined } from '@ant-design/icons';
import { useAuthStore } from '@/shared/store';
import type { RegisterCredentials } from '@/shared/types';
import { UserRole } from '@/shared/types';

const { Title, Text } = Typography;
const { Option } = Select;

export const RegisterPage: React.FC = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { signUp, user, loading } = useAuthStore();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  useEffect(() => {
    if (user && !loading) {
      navigate('/material-requests', { replace: true });
    }
  }, [user, loading, navigate]);

  const handleSubmit = async (values: RegisterCredentials & { confirmPassword: string }) => {
    setIsSubmitting(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { confirmPassword, ...credentials } = values;
      const { error } = await signUp(credentials);
      if (error) {
        message.error(error);
      } else {
        message.success('Регистрация успешна! Проверьте электронную почту для подтверждения аккаунта.');
        navigate('/login');
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
          maxWidth: 450,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Title level={2} style={{ marginBottom: 8 }}>
            PayHub
          </Title>
          <Text type="secondary">Создайте аккаунт</Text>
        </div>

        <Form
          form={form}
          name="register"
          onFinish={handleSubmit}
          layout="vertical"
          requiredMark={false}
        >
          <Form.Item
            name="fullName"
            label="Полное имя"
            rules={[
              { required: true, message: 'Пожалуйста, введите полное имя!' },
              { min: 2, message: 'Полное имя должно содержать минимум 2 символа!' },
            ]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="Полное имя"
              size="large"
              autoComplete="name"
            />
          </Form.Item>

          <Form.Item
            name="email"
            label="Электронная почта"
            rules={[
              { required: true, message: 'Пожалуйста, введите email!' },
              { type: 'email', message: 'Пожалуйста, введите корректный email!' },
            ]}
          >
            <Input
              prefix={<MailOutlined />}
              placeholder="Электронная почта"
              size="large"
              autoComplete="email"
            />
          </Form.Item>

          <Form.Item
            name="role"
            label="Роль"
            rules={[{ required: true, message: 'Пожалуйста, выберите роль!' }]}
          >
            <Select
              placeholder="Выберите роль"
              size="large"
              suffixIcon={<TeamOutlined />}
            >
              <Option value={UserRole.PROCUREMENT_OFFICER}>Снабженец</Option>
              <Option value={UserRole.CONSTRUCTION_MANAGER}>Руководитель строительства</Option>
              <Option value={UserRole.DIRECTOR}>Директор</Option>
              <Option value={UserRole.ACCOUNTANT}>Бухгалтер</Option>
              <Option value={UserRole.ADMIN}>Администратор</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="password"
            label="Пароль"
            rules={[
              { required: true, message: 'Пожалуйста, введите пароль!' },
              { min: 6, message: 'Пароль должен содержать минимум 6 символов!' },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Пароль"
              size="large"
              autoComplete="new-password"
            />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            label="Подтвердите пароль"
            dependencies={['password']}
            rules={[
              { required: true, message: 'Пожалуйста, подтвердите пароль!' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('Пароли не совпадают!'));
                },
              }),
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Подтвердите пароль"
              size="large"
              autoComplete="new-password"
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
              Зарегистрироваться
            </Button>
          </Form.Item>

          <div style={{ textAlign: 'center' }}>
            <Text type="secondary">
              Уже есть аккаунт?{' '}
              <Link to="/login">Войдите</Link>
            </Text>
          </div>
        </Form>
      </Card>
    </div>
  );
};