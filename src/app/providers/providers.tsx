import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { SnackbarProvider } from 'notistack';
import { ConfigProvider, App as AntdApp } from 'antd';
import { QueryProvider } from './query-provider';
import { useAuthStore } from '@/features/auth/model/auth-store';
import { DeviceProvider } from '@/features/device-preferences';

// Ant Design theme configuration
const antdTheme = {
  token: {
    // Customize Ant Design theme tokens here
    colorPrimary: '#1677ff',
    borderRadius: 6,
    wireframe: false,
  },
  components: {
    // Component-specific theme customization
    Layout: {
      siderBg: '#fff',
      triggerBg: '#fff',
    },
  },
};

interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  const initialize = useAuthStore((state) => state.initialize);
  const refreshSession = useAuthStore((state) => state.refreshSession);

  // Initialize auth on app startup
  useEffect(() => {
    initialize();
    
    // Refresh token every 30 minutes to prevent expiration
    const tokenRefreshInterval = setInterval(() => {
      console.log('Refreshing auth token...');
      // Use refreshSession instead of initialize to avoid resetting loading state
      if (refreshSession) {
        refreshSession();
      }
    }, 30 * 60 * 1000); // 30 minutes
    
    // Also refresh on visibility change (when tab becomes active)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('Tab became visible, refreshing session...');
        // Use refreshSession instead of initialize to avoid resetting loading state
        if (refreshSession) {
          refreshSession();
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      clearInterval(tokenRefreshInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [initialize, refreshSession]);

  return (
    <QueryProvider>
      <DeviceProvider>
        <ConfigProvider theme={antdTheme}>
          <AntdApp>
            <SnackbarProvider
              maxSnack={3}
              anchorOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              autoHideDuration={5000}
              dense
              preventDuplicate
            >
              {children}
            </SnackbarProvider>
          </AntdApp>
        </ConfigProvider>
      </DeviceProvider>
    </QueryProvider>
  );
}