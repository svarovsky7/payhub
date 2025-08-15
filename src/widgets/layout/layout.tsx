import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Layout as AntdLayout,
  Menu,
  Button,
  Typography,
  Avatar,
  Dropdown,
  Breadcrumb,
  theme,
  Drawer,
} from 'antd';
import {
  FileTextOutlined,
  ProjectOutlined,
  SettingOutlined,
  UserOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  CheckCircleOutlined,
  DollarOutlined,
  CloseCircleOutlined,
  TeamOutlined,
  AuditOutlined,
  HomeOutlined,
  RocketOutlined,
  ContactsOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '@/features/auth/model/auth-store';
import { usePrefetchCommonData } from '@/features/data-prefetch';
import { useDevice } from '@/features/device-preferences';
import type { MenuProps } from 'antd';

const { Header, Sider, Content } = AntdLayout;
const { Title } = Typography;

const menuItems = [
  {
    key: '/invoices',
    icon: <FileTextOutlined />,
    label: 'Счета',
  },
  {
    key: 'approvals',
    icon: <AuditOutlined />,
    label: 'Согласования',
    children: [
      {
        key: '/approvals/rukstroy',
        icon: <TeamOutlined />,
        label: 'Согласование Рукстроя',
      },
      {
        key: '/approvals/director',
        icon: <ContactsOutlined />,
        label: 'Директор',
      },
      {
        key: '/approvals/supply',
        icon: <RocketOutlined />,
        label: 'Снабжение',
      },
      {
        key: '/approvals/payment',
        icon: <DollarOutlined />,
        label: 'В Оплате',
      },
      {
        key: '/approvals/paid',
        icon: <CheckCircleOutlined />,
        label: 'Оплачено',
      },
      {
        key: '/approvals/rejected',
        icon: <CloseCircleOutlined />,
        label: 'Отказано',
      },
    ],
  },
  {
    key: '/kanban',
    icon: <ProjectOutlined />,
    label: 'Канбан',
  },
  {
    key: '/admin',
    icon: <SettingOutlined />,
    label: 'Администрирование',
  },
];

// Create breadcrumb mapping
const breadcrumbNameMap: Record<string, string> = {
  '/invoices': 'Счета',
  '/approvals': 'Согласования',
  '/approvals/rukstroy': 'Согласование Рукстроя',
  '/approvals/director': 'Директор',
  '/approvals/supply': 'Снабжение',
  '/approvals/payment': 'В Оплате',
  '/approvals/paid': 'Оплачено',
  '/approvals/rejected': 'Отказано',
  '/kanban': 'Канбан',
  '/admin': 'Администрирование',
  '/profile': 'Профиль',
};

export function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [openKeys, setOpenKeys] = useState<string[]>(['approvals']);
  const { user, signOut } = useAuthStore();
  const { effectiveDevice, isTouch } = useDevice();
  const location = useLocation();
  const navigate = useNavigate();
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();
  
  // Prefetch common data on layout mount
  usePrefetchCommonData();

  // Derive layout properties from device preferences
  const isMobile = effectiveDevice === 'tablet' && window.innerWidth < 768;
  const isTablet = effectiveDevice === 'tablet' && window.innerWidth >= 768;
  
  // Responsive behavior based on device preferences
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      
      // Auto-collapse sidebar based on device preference and screen size
      if (effectiveDevice === 'tablet' || (effectiveDevice === 'desktop' && width < 1024)) {
        setCollapsed(true);
      } else if (effectiveDevice === 'desktop' && width >= 1024) {
        setCollapsed(false);
      }
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [effectiveDevice]);

  const handleMenuClick = ({ key }: { key: string }) => {
    // Don't navigate if clicking on submenu parent
    if (key !== 'approvals') {
      navigate(key);
      // Close mobile drawer after navigation
      if (isMobile) {
        setMobileDrawerOpen(false);
      }
    }
  };

  const handleOpenChange = (keys: string[]) => {
    setOpenKeys(keys);
  };

  // Generate breadcrumb items
  const getBreadcrumbItems = () => {
    const pathSnippets = location.pathname.split('/').filter(i => i);
    const breadcrumbItems = [
      {
        title: (
          <span>
            <HomeOutlined style={{ marginRight: 4 }} />
            Главная
          </span>
        ),
        onClick: () => navigate('/invoices'),
      },
    ];

    let url = '';
    pathSnippets.forEach((snippet, index) => {
      url += `/${snippet}`;
      const isLast = index === pathSnippets.length - 1;
      const name = breadcrumbNameMap[url] || snippet;
      
      if (isLast) {
        breadcrumbItems.push({
          title: <span>{name}</span>,
          onClick: () => {},
        });
      } else {
        breadcrumbItems.push({
          title: (
            <Button 
              type="link" 
              size="small"
              style={{ padding: 0, height: 'auto', fontSize: 'inherit' }}
              onClick={() => navigate(url)}
            >
              {name}
            </Button>
          ),
          onClick: () => navigate(url),
        });
      }
    });

    return breadcrumbItems;
  };

  // Get selected keys for proper highlighting
  const getSelectedKeys = () => {
    const path = location.pathname;
    if (path.startsWith('/approvals/')) {
      return [path];
    }
    return [path];
  };

  // Update open keys when location changes
  React.useEffect(() => {
    if (location.pathname.startsWith('/approvals/')) {
      setOpenKeys(['approvals']);
    }
  }, [location.pathname]);

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: 'Profile',
      onClick: () => navigate('/profile'),
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Logout',
      onClick: handleLogout,
    },
  ];

  // Sidebar content component for reuse
  const SidebarContent = () => (
    <>
      <div style={{
        height: 64,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderBottom: '1px solid #f0f0f0',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      }}>
        {(!collapsed && !isMobile) && (
          <Title level={4} style={{ margin: 0, color: 'white' }}>
            PayHub
          </Title>
        )}
        {(collapsed || isMobile) && (
          <div style={{ 
            width: 32, 
            height: 32, 
            background: 'white', 
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#667eea',
            fontWeight: 'bold',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
          }}>
            P
          </div>
        )}
      </div>
      <Menu
        theme="light"
        mode="inline"
        selectedKeys={getSelectedKeys()}
        openKeys={openKeys}
        onOpenChange={handleOpenChange}
        items={menuItems}
        onClick={handleMenuClick}
        style={{ 
          borderRight: 0,
          background: 'transparent',
          fontWeight: 500,
        }}
        className="custom-menu"
      />
    </>
  );
  
  return (
    <AntdLayout style={{ minHeight: '100vh' }}>
      {/* Desktop/Tablet Sidebar */}
      {!isMobile && (
        <Sider
          trigger={null}
          collapsible
          collapsed={collapsed}
          width={isTablet ? 220 : 250}
          collapsedWidth={isTablet ? 60 : 80}
          style={{
            background: 'linear-gradient(180deg, #f8f9fa 0%, #ffffff 100%)',
            borderRight: '1px solid #e8e8e8',
            boxShadow: '2px 0 8px rgba(0,0,0,0.05)',
            zIndex: isTablet ? 100 : 'auto',
          }}
        >
          <SidebarContent />
        </Sider>
      )}
      
      {/* Mobile Drawer */}
      {isMobile && (
        <Drawer
          title={null}
          placement="left"
          closable={false}
          onClose={() => setMobileDrawerOpen(false)}
          open={mobileDrawerOpen}
          bodyStyle={{ padding: 0 }}
          width={280}
          style={{ zIndex: 1001 }}
        >
          <SidebarContent />
        </Drawer>
      )}
      
      <AntdLayout>
        <Header
          style={{
            padding: isTouch ? '0 12px' : '0 16px',
            background: colorBgContainer,
            borderBottom: '1px solid #f0f0f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: isTouch ? 56 : isTablet ? 56 : 64,
          }}
        >
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => {
              if (isMobile) {
                setMobileDrawerOpen(!mobileDrawerOpen);
              } else {
                setCollapsed(!collapsed);
              }
            }}
            style={{
              fontSize: isTouch ? '18px' : '16px',
              width: isTouch ? 48 : isTablet ? 56 : 64,
              height: isTouch ? 48 : isTablet ? 56 : 64,
              minHeight: isTouch ? 44 : 'auto',
            }}
            className={isTouch ? 'touch-target' : ''}
          />
          
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 12 }}>
            {!isMobile && (
              <span style={{ 
                fontSize: isTablet ? '14px' : '16px',
                display: isTablet && window.innerWidth < 900 ? 'none' : 'inline'
              }}>
                Добро пожаловать, {user?.full_name || user?.email}
              </span>
            )}
            <Dropdown 
              menu={{ items: userMenuItems }} 
              trigger={['click']}
              placement="bottomRight"
            >
              <Avatar
                size={isTouch ? 'default' : isTablet ? 'small' : 'default'}
                icon={<UserOutlined />}
                style={{ 
                  cursor: 'pointer',
                  minWidth: isTouch ? 44 : 'auto',
                  minHeight: isTouch ? 44 : 'auto'
                }}
                className={isTouch ? 'touch-target' : ''}
              />
            </Dropdown>
          </div>
        </Header>
        
        <Content
          style={{
            margin: isTouch ? '8px' : isTablet ? '12px' : '16px',
            padding: 0,
            minHeight: isTouch ? 'calc(100vh - 72px)' : isTablet ? 'calc(100vh - 88px)' : 'calc(100vh - 112px)',
          }}
        >
          <div style={{
            padding: isTouch ? '12px 16px' : isTablet ? '14px 20px' : '16px 24px',
            background: colorBgContainer,
            borderRadius: borderRadiusLG,
            marginBottom: isTouch ? 8 : isTablet ? 12 : 16,
          }}>
            <Breadcrumb 
              items={getBreadcrumbItems()}
              style={{ 
                fontSize: isTouch ? '13px' : '14px',
                lineHeight: isTouch ? '20px' : '22px'
              }}
            />
          </div>
          <div style={{
            padding: isTouch ? '16px' : isTablet ? '20px' : '24px',
            background: colorBgContainer,
            borderRadius: borderRadiusLG,
            minHeight: isTouch ? 'calc(100vh - 140px)' : isTablet ? 'calc(100vh - 160px)' : 'calc(100vh - 180px)',
          }}>
            <Outlet />
          </div>
        </Content>
      </AntdLayout>
    </AntdLayout>
  );
}