import { Typography, Tabs, Card } from 'antd';
import {
  UserOutlined,
  ShopOutlined,
  BankOutlined,
  ProjectOutlined,
} from '@ant-design/icons';
import { UsersManagement } from './components/users-management';
import { ContractorsManagement } from './components/contractors-management';
import { PayersManagement } from './components/payers-management';
import { ProjectsManagement } from './components/projects-management';
import './admin.css';

const { Title } = Typography;

export function AdminPage() {
  const items = [
    {
      key: 'users',
      label: (
        <span>
          <UserOutlined />
          Пользователи
        </span>
      ),
      children: <UsersManagement />,
    },
    {
      key: 'projects',
      label: (
        <span>
          <ProjectOutlined />
          Проекты
        </span>
      ),
      children: <ProjectsManagement />,
    },
    {
      key: 'contractors',
      label: (
        <span>
          <ShopOutlined />
          Поставщики
        </span>
      ),
      children: <ContractorsManagement />,
    },
    {
      key: 'payers',
      label: (
        <span>
          <BankOutlined />
          Плательщики
        </span>
      ),
      children: <PayersManagement />,
    },
  ];

  return (
    <div className="admin-panel" style={{ padding: '24px' }}>
      <Title level={2} style={{ marginBottom: 24 }}>Панель администрирования</Title>
      
      <Card 
        styles={{ 
          body: { padding: 0 } 
        }}
        style={{ 
          boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03), 0 1px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px 0 rgba(0, 0, 0, 0.02)',
          transition: 'none'
        }}
        hoverable={false}
      >
        <Tabs
          defaultActiveKey="users"
          items={items}
          size="large"
          style={{ padding: '0 24px' }}
        />
      </Card>
    </div>
  );
}