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
    let mounted = true;
    let tokenRefreshInterval: NodeJS.Timeout | null = null;
    let visibilityTimeout: NodeJS.Timeout | null = null;
    let lastRefreshTime = Date.now();
    const MIN_REFRESH_INTERVAL = 60 * 1000; // Minimum 1 minute between refreshes

    // Initialize auth
    if (mounted) {
      initialize();
    }
    
    // Refresh token every 30 minutes to prevent expiration
    tokenRefreshInterval = setInterval(() => {
      if (mounted && refreshSession) {
        lastRefreshTime = Date.now();
        refreshSession();
      }
    }, 30 * 60 * 1000); // 30 minutes
    
    // Also refresh on visibility change (when tab becomes active)
    const handleVisibilityChange = () => {
      if (!document.hidden && mounted && refreshSession) {
        const timeSinceLastRefresh = Date.now() - lastRefreshTime;
        
        // Only refresh if enough time has passed since last refresh
        if (timeSinceLastRefresh >= MIN_REFRESH_INTERVAL) {
          // Throttle visibility refresh to avoid excessive calls
          if (visibilityTimeout) {
            clearTimeout(visibilityTimeout);
          }
          visibilityTimeout = setTimeout(() => {
            if (mounted) {
              lastRefreshTime = Date.now();
              refreshSession();
            }
          }, 1000);
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      mounted = false;
      if (tokenRefreshInterval) {
        clearInterval(tokenRefreshInterval);
      }
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