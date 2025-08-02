import React, { useState, useEffect } from 'react';
import {
  Card,
  Tabs,
  Typography,
  Form,
  Input,
  Button,
  Select,
  Space,
  Divider,
  Avatar,
} from 'antd';
import {
  UserOutlined,
  LockOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '@/shared/store';
import { UserRole } from '@/shared/types';
import { message } from '@/shared/ui';
import { supabase } from '@/shared/api';
import { useQuery } from '@tanstack/react-query';
import { referenceDataApi } from '@/entities/reference-data/api';

const { Title, Text } = Typography;
const { Option } = Select;

export const ProfilePage: React.FC = () => {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [profileForm] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [roleForm] = Form.useForm();

  // Загружаем проекты
  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: referenceDataApi.getProjects,
  });

  // Загружаем текущий проект пользователя
  useEffect(() => {
    const loadUserProject = async () => {
      if (!user?.id) return;
      
      try {
        const { data, error } = await supabase
          .from('user_projects')
          .select('project_id')
          .eq('user_id', user.id)
          .maybeSingle(); // Используем maybeSingle вместо single для избежания ошибки если записи нет
        
        if (!error && data) {
          profileForm.setFieldValue('project_id', data.project_id);
        }
      } catch (error) {
        console.error('Error loading user project:', error);
        // Не показываем ошибку пользователю, так как это не критично
      }
    };
    
    loadUserProject();
  }, [user, profileForm]);

  const handleUpdateProfile = async (values: { full_name: string; project_id?: number }) => {
    if (!user) {
      console.log('No user found, aborting update');
      return;
    }
    
    console.log('Starting profile update with values:', values);
    setLoading(true);
    
    try {
      console.log('Step 1: Updating user profile...');
      const { error } = await supabase
        .from('user_profiles')
        .update({ 
          full_name: values.full_name,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) {
        console.error('Error updating user_profiles:', error);
        throw error;
      }
      console.log('Step 1: User profile updated successfully');

      // Skip auth metadata update as it's causing delays and not critical
      console.log('Step 2: Skipping auth metadata update for performance');

      // Update user project if changed
      if (values.project_id !== undefined) {
        console.log('Step 3: Updating user project...', values.project_id);
        try {
          // Сначала удаляем старую связь
          console.log('Step 3a: Removing existing user project links...');
          const { error: deleteError } = await supabase
            .from('user_projects')
            .delete()
            .eq('user_id', user.id);
          
          if (deleteError) {
            console.error('Error deleting old user projects:', deleteError);
          } else {
            console.log('Step 3a: Old user project links removed');
          }
          
          // Затем создаем новую связь, если проект выбран
          if (values.project_id) {
            console.log('Step 3b: Creating new user project link...');
            const { error: insertError } = await supabase
              .from('user_projects')
              .insert({
                user_id: user.id,
                project_id: values.project_id,
              });
            
            if (insertError) {
              console.error('Error creating user project:', insertError);
            } else {
              console.log('Step 3b: New user project link created successfully');
            }
          } else {
            console.log('Step 3b: No project selected, skipping insert');
          }
        } catch (projectError) {
          console.error('Error in project update block:', projectError);
        }
        console.log('Step 3: Project update completed');
      } else {
        console.log('Step 3: No project_id change detected, skipping project update');
      }

      console.log('All steps completed successfully');
      message.success('Профиль успешно обновлен!');
      
    } catch (error) {
      console.error('Error updating profile:', error);
      message.error('Ошибка при обновлении профиля: ' + (error as Error).message);
    } finally {
      console.log('Setting loading to false');
      setLoading(false);
    }
  };

  const handleChangePassword = async (values: { 
    currentPassword: string; 
    newPassword: string; 
    confirmPassword: string;
  }) => {
    console.log('Starting password change process...');
    
    if (values.newPassword !== values.confirmPassword) {
      console.log('Password validation failed: passwords do not match');
      message.error('Пароли не совпадают');
      return;
    }

    if (values.newPassword.length < 6) {
      console.log('Password validation failed: password too short');
      message.error('Пароль должен содержать минимум 6 символов');
      return;
    }

    console.log('Password validation passed, starting update...');
    setLoading(true);
    
    try {
      console.log('Calling supabase.auth.updateUser...');
      
      // Добавляем таймаут для предотвращения зависания
      const passwordUpdatePromise = supabase.auth.updateUser({
        password: values.newPassword
      });
      
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Password update timeout')), 30000)
      );
      
      const { error } = await Promise.race([passwordUpdatePromise, timeoutPromise]) as any;

      if (error) {
        console.error('Supabase auth error:', error);
        throw error;
      }

      console.log('Password updated successfully');
      message.success('Пароль успешно изменен!');
      console.log('Clearing password form fields...');
      passwordForm.resetFields();
    } catch (error) {
      console.error('Error changing password:', error);
      const errorMessage = (error as any).message || (error as Error).message;
      
      if (errorMessage === 'Password update timeout') {
        message.error('Время ожидания истекло. Попробуйте еще раз.');
        console.log('Clearing form due to timeout...');
        passwordForm.resetFields();
      } else if (errorMessage.includes('New password should be different from the old password')) {
        message.error('Новый пароль должен отличаться от текущего пароля.');
        console.log('Clearing form due to same password error...');
        passwordForm.resetFields();
      } else if (errorMessage.includes('password')) {
        message.error('Ошибка при смене пароля. Проверьте правильность введенных данных.');
      } else {
        message.error('Ошибка при смене пароля: ' + errorMessage);
      }
    } finally {
      console.log('Setting loading to false');
      setLoading(false);
    }
  };

  const handleChangeRole = async (values: { role: UserRole }) => {
    if (!user) {
      console.log('No user found, aborting role change');
      return;
    }
    
    console.log('Starting role change process...', {
      userId: user.id,
      currentRole: user.role,
      newRole: values.role
    });
    
    setLoading(true);
    try {
      // Сначала получаем role_id по коду роли
      console.log('Step 1: Looking up role_id for role code:', values.role);
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('id, code, name')
        .eq('code', values.role)
        .single();

      if (roleError || !roleData) {
        console.error('Role lookup failed:', roleError);
        throw new Error('Роль не найдена в системе');
      }

      console.log('Step 1: Found role data:', roleData);

      // Обновляем role_id в user_profiles
      console.log('Step 2: Updating user_profiles with role_id:', roleData.id);
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ 
          role_id: roleData.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (updateError) {
        console.error('Database update failed:', updateError);
        throw updateError;
      }

      console.log('Step 2: Database updated successfully');

      // Обновляем состояние пользователя в auth store перед перезагрузкой
      console.log('Step 3: Updating auth store with new role...');
      const { setUser } = useAuthStore.getState();
      setUser({
        ...user,
        role: values.role,
        role_id: roleData.id
      });

      message.success('Роль успешно изменена!');
      
      console.log('Step 4: Reloading page...');
      // Reload page to update user data and navigation
      setTimeout(() => {
        window.location.reload();
      }, 1000); // Даем время на обновление состояния
      
    } catch (error) {
      console.error('Error updating role:', error);
      message.error('Ошибка при смене роли: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const getRoleDisplayName = (role: UserRole) => {
    const roleNames = {
      [UserRole.PROCUREMENT_OFFICER]: 'Снабженец',
      [UserRole.CONSTRUCTION_MANAGER]: 'Руководитель строительства',
      [UserRole.DIRECTOR]: 'Генеральный директор',
      [UserRole.ACCOUNTANT]: 'Бухгалтер',
      [UserRole.ADMIN]: 'Администратор',
    };
    return roleNames[role] || role;
  };

  const getCurrentRoleName = () => {
    return user?.role ? getRoleDisplayName(user.role as UserRole) : 'Не указана';
  };

  const tabItems = [
    {
      key: 'profile',
      label: 'Личные данные',
      icon: <UserOutlined />,
      children: (
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24 }}>
            <Avatar size={64} icon={<UserOutlined />} />
            <div style={{ marginLeft: 16 }}>
              <Title level={4} style={{ margin: 0 }}>
                {user?.full_name || 'Не указано'}
              </Title>
              <Text type="secondary">{user?.email}</Text>
              <br />
              <Text type="secondary">
                Роль: {getCurrentRoleName()}
              </Text>
            </div>
          </div>

          <Divider>Изменить ФИО</Divider>

          <Form
            form={profileForm}
            layout="vertical"
            onFinish={handleUpdateProfile}
            initialValues={{ full_name: user?.full_name || '' }}
          >
            <Form.Item
              name="full_name"
              label="ФИО"
              rules={[
                { required: true, message: 'Введите ФИО!' },
                { min: 2, message: 'ФИО должно содержать минимум 2 символа!' },
              ]}
            >
              <Input 
                placeholder="Например: Иванов Иван Иванович" 
                size="large"
              />
            </Form.Item>

            <Form.Item
              name="project_id"
              label="Проект"
              rules={[
                { required: user?.role === 'CONSTRUCTION_MANAGER', message: 'Выберите проект!' },
              ]}
            >
              <Select 
                placeholder="Выберите проект" 
                size="large"
                allowClear
              >
                {projects.map((project) => (
                  <Option key={project.id} value={project.id}>
                    {project.name} {project.code ? `(${project.code})` : ''}
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                size="large"
              >
                Сохранить изменения
              </Button>
            </Form.Item>
          </Form>
        </Card>
      ),
    },
    {
      key: 'password',
      label: 'Пароль',
      icon: <LockOutlined />,
      children: (
        <Card>
          <Title level={4}>Изменить пароль</Title>
          <Text type="secondary">
            Для изменения пароля введите текущий пароль и новый пароль.
          </Text>

          <Divider />

          <Form
            form={passwordForm}
            layout="vertical"
            onFinish={handleChangePassword}
          >
            <Form.Item
              name="currentPassword"
              label="Текущий пароль"
              rules={[{ required: true, message: 'Введите текущий пароль!' }]}
            >
              <Input.Password 
                placeholder="Введите текущий пароль" 
                size="large"
              />
            </Form.Item>

            <Form.Item
              name="newPassword"
              label="Новый пароль"
              rules={[
                { required: true, message: 'Введите новый пароль!' },
                { min: 6, message: 'Пароль должен содержать минимум 6 символов!' },
              ]}
            >
              <Input.Password 
                placeholder="Введите новый пароль" 
                size="large"
              />
            </Form.Item>

            <Form.Item
              name="confirmPassword"
              label="Подтвердите пароль"
              rules={[
                { required: true, message: 'Подтвердите новый пароль!' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('newPassword') === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error('Пароли не совпадают!'));
                  },
                }),
              ]}
            >
              <Input.Password 
                placeholder="Подтвердите новый пароль" 
                size="large"
              />
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                size="large"
              >
                Изменить пароль
              </Button>
            </Form.Item>
          </Form>
        </Card>
      ),
    },
    {
      key: 'role',
      label: 'Роль',
      icon: <SettingOutlined />,
      children: (
        <Card>
          <Title level={4}>Изменить роль</Title>
          <Text type="secondary">
            Текущая роль: <strong>{getCurrentRoleName()}</strong>
          </Text>

          <Divider />

          <Form
            form={roleForm}
            layout="vertical"
            onFinish={handleChangeRole}
            initialValues={{ role: user?.role }}
          >
            <Form.Item
              name="role"
              label="Выберите новую роль"
              rules={[{ required: true, message: 'Выберите роль!' }]}
            >
              <Select placeholder="Выберите роль" size="large">
                <Option value={UserRole.PROCUREMENT_OFFICER}>
                  {getRoleDisplayName(UserRole.PROCUREMENT_OFFICER)}
                </Option>
                <Option value={UserRole.CONSTRUCTION_MANAGER}>
                  {getRoleDisplayName(UserRole.CONSTRUCTION_MANAGER)}
                </Option>
                <Option value={UserRole.DIRECTOR}>
                  {getRoleDisplayName(UserRole.DIRECTOR)}
                </Option>
                <Option value={UserRole.ACCOUNTANT}>
                  {getRoleDisplayName(UserRole.ACCOUNTANT)}
                </Option>
                <Option value={UserRole.ADMIN}>
                  {getRoleDisplayName(UserRole.ADMIN)}
                </Option>
              </Select>
            </Form.Item>

            <Form.Item>
              <Space>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  size="large"
                >
                  Изменить роль
                </Button>
                <Text type="secondary">
                  После смены роли страница будет перезагружена
                </Text>
              </Space>
            </Form.Item>
          </Form>
        </Card>
      ),
    },
  ];

  return (
    <Card>
      <Title level={2}>Профиль пользователя</Title>
      <Tabs
        items={tabItems}
        size="large"
        style={{ marginTop: 16 }}
      />
    </Card>
  );
};