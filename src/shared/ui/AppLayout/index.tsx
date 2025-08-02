import React from 'react';
import { Layout, Menu, Avatar, Dropdown, Space, Typography } from 'antd';
import { UserOutlined, LogoutOutlined, SettingOutlined } from '@ant-design/icons';
import { useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/shared/store';

const { Header, Content } = Layout;
const { Title } = Typography;

export const AppLayout: React.FC = () => {
  const { user, signOut } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();

  const menuItems = [
    {
      key: '/materials',
      label: 'Материалы',
    },
    {
      key: '/approvals',
      label: 'На согласовании',
    },
  ];

  // Добавляем администрирование для админов
  if (user?.role === 'ADMIN') {
    menuItems.push({
      key: '/admin',
      label: 'Администрирование',
    });
  }

  const userMenuItems = [
    {
      key: 'profile',
      label: 'Профиль',
      icon: <UserOutlined />,
      onClick: () => {
        // TODO: Navigate to profile page
        console.log('Navigate to profile');
      },
    },
  ];

  // Добавляем администрирование в меню пользователя для админов
  if (user?.role === 'ADMIN') {
    userMenuItems.push({
      key: 'admin',
      label: 'Администрирование',
      icon: <SettingOutlined />,
      onClick: () => navigate('/admin'),
    });
  }

  userMenuItems.push({
    type: 'divider' as const,
  }, {
    key: 'logout',
    label: 'Выход',
    icon: <LogoutOutlined />,
    onClick: signOut,
  });

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key);
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header
        style={{
          padding: '0 24px',
          background: '#fff',
          borderBottom: '1px solid #f0f0f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Title level={3} style={{ margin: 0, color: '#1890ff', marginRight: 32 }}>
            PayHub
          </Title>
          <Menu
            mode="horizontal"
            selectedKeys={[location.pathname]}
            items={menuItems}
            onClick={handleMenuClick}
            style={{ 
              border: 'none',
              backgroundColor: 'transparent',
              minWidth: 300,
            }}
          />
        </div>

        <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
          <Space style={{ cursor: 'pointer' }}>
            <Avatar icon={<UserOutlined />} />
            <span>{user?.full_name || user?.email}</span>
          </Space>
        </Dropdown>
      </Header>

      <Content style={{ padding: '24px' }}>
        <Outlet />
      </Content>
    </Layout>
  );
};