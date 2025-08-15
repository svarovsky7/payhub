import { useState, useEffect } from 'react';
import { 
  Typography, 
  Card, 
  Form, 
  Input, 
  Select, 
  Button, 
  Space, 
  message,
  Row,
  Col,
  Spin,
  Avatar,
  Divider,
} from 'antd';
import { 
  UserOutlined, 
  SaveOutlined,
  MailOutlined,
  ProjectOutlined,
  MobileOutlined,
  DesktopOutlined,
  TabletOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '@/features/auth';
import { userApi, projectApi } from '@/entities';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDevice, useDeviceStore, type DeviceType } from '@/features/device-preferences';
import type { Project } from '@/shared/types';

const { Title, Text } = Typography;

export function ProfilePage() {
  const { user, initialize } = useAuthStore();
  const { effectiveDevice, isTouch, setPreferredDevice } = useDevice();
  const [form] = Form.useForm();
  const [isEditing, setIsEditing] = useState(false);
  const [devicePreference, setDevicePreference] = useState<DeviceType>('auto');
  const queryClient = useQueryClient();

  // Fetch user data with error handling and refetch on mount
  const { data: userData, isLoading: userLoading, error: userError, refetch: refetchUser } = useQuery({
    queryKey: ['user-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('User not found');
      return userApi.getById(user.id);
    },
    enabled: !!user?.id,
    staleTime: 0, // Always consider data stale
    refetchOnMount: 'always', // Always refetch on mount
    refetchOnWindowFocus: true,
    retry: (failureCount, error: unknown) => {
      // Retry on network errors but not on auth errors
      const errorMessage = error instanceof Error ? error.message : '';
      if (errorMessage.includes('JWT') || errorMessage.includes('refresh')) {
        initialize(); // Refresh auth token
        return false;
      }
      return failureCount < 2;
    }
  });

  // Fetch projects with similar settings
  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: projectApi.getAll,
    staleTime: 60000, // Consider fresh for 1 minute
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  // Force refetch on mount if data is missing
  useEffect(() => {
    if (user?.id && !userData && !userLoading) {
      console.log('User data missing, refetching...');
      refetchUser();
    }
  }, [user?.id, userData, userLoading, refetchUser]);

  // Update user mutation
  const updateMutation = useMutation({
    mutationFn: (values: { full_name: string; project_id: number | null }) => 
      userApi.update(user!.id, values),
    onSuccess: () => {
      message.success('Профиль успешно обновлен');
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      // Refresh auth state to update user data globally
      initialize();
    },
    onError: (error) => {
      console.error('Failed to update profile:', error);
      message.error('Ошибка при обновлении профиля');
    },
  });

  // Initialize device preference from store
  useEffect(() => {
    const { preferences } = useDeviceStore.getState();
    setDevicePreference(preferences.preferredDevice);
  }, []);

  // Set form values when user data changes
  useEffect(() => {
    const dataToUse = userData || user;
    
    if (dataToUse && !userLoading) {
      const formValues = {
        full_name: dataToUse.full_name || '',
        email: dataToUse.email || '',
        project_id: dataToUse.project_id || undefined,
        device_preference: devicePreference,
      };
      
      // Only update form if not currently editing
      if (!isEditing) {
        form.setFieldsValue(formValues);
      }
    }
  }, [userData, user, userLoading, isEditing, form, devicePreference]);

  const handleSubmit = (values: { full_name: string; project_id: number | null; device_preference: DeviceType }) => {
    // Save device preference locally
    if (values.device_preference) {
      setPreferredDevice(values.device_preference);
      setDevicePreference(values.device_preference);
    }
    
    // Update user profile (excluding device_preference since it's not in DB)
    updateMutation.mutate({
      full_name: values.full_name,
      project_id: values.project_id,
    });
  };

  const handleEdit = () => {
    // Set form values when starting edit
    const dataToUse = userData || user;
    if (dataToUse) {
      const formValues = {
        full_name: dataToUse.full_name || '',
        email: dataToUse.email || '',
        project_id: dataToUse.project_id || undefined,
        device_preference: devicePreference,
      };
      form.setFieldsValue(formValues);
    }
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    // Reset form to original values
    const resetUser = userData || user;
    if (resetUser) {
      form.setFieldsValue({
        full_name: resetUser.full_name || '',
        email: resetUser.email || '',
        project_id: resetUser.project_id || undefined,
        device_preference: devicePreference,
      });
    }
  };

  // Show error if there's an auth issue
  if (userError) {
    const errorMessage = userError instanceof Error ? userError.message : 'Неизвестная ошибка';
    if (errorMessage.includes('JWT') || errorMessage.includes('refresh') || errorMessage.includes('auth')) {
      return (
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <Title level={3}>Сессия истекла</Title>
          <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
            Пожалуйста, войдите в систему заново
          </Text>
          <Button type="primary" onClick={() => {
            initialize();
            window.location.href = '/login';
          }}>
            Перейти к входу
          </Button>
        </div>
      );
    }
  }

  if (userLoading || projectsLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" tip="Загрузка профиля..." />
      </div>
    );
  }

  // Use userData if available, otherwise fall back to auth store user
  const displayUser = userData || user;

  if (!displayUser) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Title level={3}>Не удалось загрузить данные профиля</Title>
        <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
          Пожалуйста, попробуйте обновить страницу
        </Text>
        <Button onClick={() => window.location.reload()}>
          Обновить страницу
        </Button>
      </div>
    );
  }

  return (
    <div>
      <Row gutter={[24, 24]}>
        <Col xs={24} lg={8}>
          <Card>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <Avatar 
                size={120} 
                icon={<UserOutlined />}
                style={{ backgroundColor: '#1890ff' }}
              />
              <Title level={4} style={{ marginTop: 16, marginBottom: 0 }}>
                {displayUser?.full_name || 'Пользователь'}
              </Title>
              <Text type="secondary">{displayUser?.email}</Text>
            </div>
            
            <Divider />
            
            <div>
              <Space direction="vertical" style={{ width: '100%' }} size="middle">
                <div>
                  <Text type="secondary">
                    <MailOutlined /> Email
                  </Text>
                  <div>{displayUser?.email}</div>
                </div>
                
                <div>
                  <Text type="secondary">
                    <ProjectOutlined /> Проект
                  </Text>
                  <div>
                    {displayUser?.project_id 
                      ? projects.find(p => p.id === displayUser.project_id)?.name || 'Не указан'
                      : 'Не указан'}
                  </div>
                </div>
                
                <div>
                  <Text type="secondary">
                    <UserOutlined /> ID пользователя
                  </Text>
                  <div>
                    <Text code>{displayUser?.id}</Text>
                  </div>
                </div>

                <div>
                  <Text type="secondary">
                    {effectiveDevice === 'desktop' ? <DesktopOutlined /> : <TabletOutlined />} Устройство
                  </Text>
                  <div>
                    <Space>
                      <Text>
                        {effectiveDevice === 'desktop' 
                          ? 'Рабочий стол' 
                          : 'Планшет/Сенсорный экран'}
                      </Text>
                      {isTouch && <Text type="secondary">(Touch)</Text>}
                    </Space>
                  </div>
                  <div>
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      Предпочтение: {devicePreference === 'auto' ? 'Автоопределение' : 
                        devicePreference === 'desktop' ? 'Рабочий стол' : 'Планшет'}
                    </Text>
                  </div>
                </div>
              </Space>
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={16}>
          <Card 
            title="Настройки профиля"
            extra={
              !isEditing && (
                <Button 
                  type="primary" 
                  onClick={handleEdit}
                >
                  Редактировать
                </Button>
              )
            }
          >
            <Form
              form={form}
              layout="vertical"
              onFinish={handleSubmit}
              disabled={!isEditing}
              initialValues={{
                full_name: displayUser?.full_name || '',
                email: displayUser?.email || '',
                project_id: displayUser?.project_id || undefined,
                device_preference: devicePreference,
              }}
            >
              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="full_name"
                    label="ФИО"
                    rules={[
                      { required: true, message: 'Пожалуйста, введите ФИО' },
                      { min: 2, message: 'ФИО должно содержать минимум 2 символа' },
                      { max: 255, message: 'ФИО не должно превышать 255 символов' },
                    ]}
                  >
                    <Input 
                      placeholder="Введите ваше ФИО"
                      prefix={<UserOutlined />}
                    />
                  </Form.Item>
                </Col>

                <Col xs={24} md={12}>
                  <Form.Item
                    name="email"
                    label="Email"
                  >
                    <Input 
                      disabled
                      prefix={<MailOutlined />}
                    />
                  </Form.Item>
                </Col>

                <Col xs={24} md={12}>
                  <Form.Item
                    name="project_id"
                    label="Проект"
                  >
                    <Select
                      placeholder="Выберите проект"
                      allowClear
                      showSearch
                      optionFilterProp="children"
                      filterOption={(input, option) =>
                        (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                      }
                      options={projects.map((project: Project) => ({
                        value: project.id,
                        label: project.name,
                      }))}
                    />
                  </Form.Item>
                </Col>

                <Col xs={24} md={12}>
                  <Form.Item
                    name="device_preference"
                    label="Предпочтительное устройство"
                    tooltip="Выберите тип устройства для оптимизации интерфейса"
                  >
                    <Select
                      placeholder="Выберите устройство"
                      options={[
                        {
                          value: 'auto',
                          label: (
                            <Space>
                              <MobileOutlined />
                              Автоопределение
                            </Space>
                          ),
                        },
                        {
                          value: 'desktop',
                          label: (
                            <Space>
                              <DesktopOutlined />
                              Рабочий стол
                            </Space>
                          ),
                        },
                        {
                          value: 'tablet',
                          label: (
                            <Space>
                              <TabletOutlined />
                              Планшет/Сенсорный экран
                            </Space>
                          ),
                        },
                      ]}
                    />
                  </Form.Item>
                </Col>
              </Row>

              {isEditing && (
                <Form.Item>
                  <Space>
                    <Button 
                      type="primary" 
                      htmlType="submit"
                      icon={<SaveOutlined />}
                      loading={updateMutation.isPending}
                    >
                      Сохранить
                    </Button>
                    <Button 
                      onClick={handleCancel}
                      disabled={updateMutation.isPending}
                    >
                      Отмена
                    </Button>
                  </Space>
                </Form.Item>
              )}
            </Form>
          </Card>

          <Card title="Информация о системе" style={{ marginTop: 24 }}>
            <Space direction="vertical" size="small">
              <Text type="secondary">
                Дата регистрации: {displayUser?.created_at 
                  ? new Date(displayUser.created_at).toLocaleDateString('ru-RU', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : 'Не указана'}
              </Text>
              <Text type="secondary">
                Последнее обновление: {displayUser?.updated_at 
                  ? new Date(displayUser.updated_at).toLocaleDateString('ru-RU', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : 'Не указано'}
              </Text>
              <Text type="secondary">
                Статус: {displayUser?.is_active 
                  ? <Text type="success">Активен</Text> 
                  : <Text type="danger">Неактивен</Text>}
              </Text>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
}