import React, { useEffect } from 'react';
import { App, ConfigProvider, theme } from 'antd';
import ruRU from 'antd/locale/ru_RU';
import { QueryProvider } from './QueryProvider';
import { NotificationProvider } from './NotificationProvider';
import { useAuthStore } from '@/shared/store';
import { MessageProvider } from '@/shared/ui';

interface AppProvidersProps {
  children: React.ReactNode;
}

export const AppProviders: React.FC<AppProvidersProps> = ({ children }) => {
  const initialize = useAuthStore((state) => state.initialize);

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <ConfigProvider
      locale={ruRU}
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: '#1890ff',
        },
      }}
    >
      <App>
        <MessageProvider>
          <QueryProvider>
            <NotificationProvider>{children}</NotificationProvider>
          </QueryProvider>
        </MessageProvider>
      </App>
    </ConfigProvider>
  );
};