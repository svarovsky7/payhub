import React, { useState } from 'react';
import {
  Card,
  Tabs,
  Typography,
} from 'antd';
import { ProjectsManagement } from './components/ProjectsManagement';
import { ContractorsManagement } from './components/ContractorsManagement';
import { PayersManagement } from './components/PayersManagement';

const { Title } = Typography;

export const AdminPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('projects');

  const tabItems = [
    {
      key: 'projects',
      label: 'Проекты',
      children: <ProjectsManagement />,
    },
    {
      key: 'contractors',
      label: 'Контрагенты',
      children: <ContractorsManagement />,
    },
    {
      key: 'payers',
      label: 'Плательщики',
      children: <PayersManagement />,
    },
  ];

  return (
    <Card>
      <Title level={2}>Администрирование</Title>
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
        size="large"
      />
    </Card>
  );
};