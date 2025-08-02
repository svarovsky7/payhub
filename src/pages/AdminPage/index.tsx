import React, { useState, useEffect } from 'react';
import {
  Card,
  Tabs,
  Typography,
} from 'antd';
import { useQueryClient } from '@tanstack/react-query';
import { ProjectsManagement } from './components/ProjectsManagement';
import { ContractorsManagement } from './components/ContractorsManagement';
import { PayersManagement } from './components/PayersManagement';
import { StatusesManagement } from './components/StatusesManagement';
import { projectsApi, contractorsApi, payersApi } from '@/entities/reference-data/api';
import { materialRequestStatusApi } from '@/entities';

const { Title } = Typography;

export const AdminPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('projects');
  const queryClient = useQueryClient();

  // Предзагружаем данные для всех вкладок при первом заходе на страницу
  useEffect(() => {
    // Предзагружаем данные с низким приоритетом
    queryClient.prefetchQuery({
      queryKey: ['admin', 'projects'],
      queryFn: projectsApi.getAll,
      staleTime: 5 * 60 * 1000,
    });
    
    queryClient.prefetchQuery({
      queryKey: ['admin', 'contractors'],
      queryFn: contractorsApi.getAll,
      staleTime: 5 * 60 * 1000,
    });
    
    queryClient.prefetchQuery({
      queryKey: ['admin', 'payers'],
      queryFn: payersApi.getAll,
      staleTime: 5 * 60 * 1000,
    });
    
    queryClient.prefetchQuery({
      queryKey: ['admin', 'statuses'],
      queryFn: materialRequestStatusApi.getAll,
      staleTime: 5 * 60 * 1000,
    });
  }, [queryClient]);

  // Обработчик переключения вкладок с предзагрузкой
  const handleTabChange = (newActiveTab: string) => {
    setActiveTab(newActiveTab);
    
    // Предзагружаем данные для новой вкладки если их еще нет
    switch (newActiveTab) {
      case 'projects':
        queryClient.prefetchQuery({
          queryKey: ['admin', 'projects'],
          queryFn: projectsApi.getAll,
          staleTime: 5 * 60 * 1000,
        });
        break;
      case 'contractors':
        queryClient.prefetchQuery({
          queryKey: ['admin', 'contractors'],
          queryFn: contractorsApi.getAll,
          staleTime: 5 * 60 * 1000,
        });
        break;
      case 'payers':
        queryClient.prefetchQuery({
          queryKey: ['admin', 'payers'],
          queryFn: payersApi.getAll,
          staleTime: 5 * 60 * 1000,
        });
        break;
      case 'statuses':
        queryClient.prefetchQuery({
          queryKey: ['admin', 'statuses'],
          queryFn: materialRequestStatusApi.getAll,
          staleTime: 5 * 60 * 1000,
        });
        break;
    }
  };

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
    {
      key: 'statuses',
      label: 'Статусы заявок',
      children: <StatusesManagement />,
    },
  ];

  return (
    <Card>
      <Title level={2}>Администрирование</Title>
      <Tabs
        activeKey={activeTab}
        onChange={handleTabChange}
        items={tabItems}
        size="large"
        destroyOnHidden={false}
      />
    </Card>
  );
};