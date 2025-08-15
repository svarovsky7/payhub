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
    <div style={{ padding: '24px' }}>
      <Title level={2} style={{ marginBottom: 24 }}>Панель администрирования</Title>
      
      <Card>
        <Tabs
          defaultActiveKey="users"
          items={items}
          size="large"
        />
      </Card>
    </div>
  );
}