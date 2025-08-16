import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { SnackbarProvider } from 'notistack';
import { ConfigProvider, App as AntdApp } from 'antd';
import { QueryProvider } from './query-provider';
import { useAuthStore } from '@/features/auth/model/auth-store';
import { DeviceProvider } from '@/features/device-preferences';

// Suppress Ant Design React 19 warning
if (typeof global !== 'undefined') {
  // @ts-expect-error - Global property for Ant Design compatibility
  global.__ANTD_COMPATIBLE__ = true;
}

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
      // Use refreshSession instead of initialize to avoid resetting loading state
      if (refreshSession) {
        refreshSession();
      }
    }, 30 * 60 * 1000); // 30 minutes
    
    // Also refresh on visibility change (when tab becomes active)
    let visibilityTimeout: NodeJS.Timeout | null = null;
    const handleVisibilityChange = () => {
      if (!document.hidden && refreshSession) {
        // Throttle visibility refresh to avoid excessive calls
        if (visibilityTimeout) {
          clearTimeout(visibilityTimeout);
        }
        visibilityTimeout = setTimeout(() => {
          refreshSession();
        }, 1000);
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      clearInterval(tokenRefreshInterval);
      if (visibilityTimeout) {
        clearTimeout(visibilityTimeout);
      }
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