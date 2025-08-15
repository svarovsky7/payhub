import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

// Create a client with optimized settings for better performance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Global query options
      staleTime: 10 * 60 * 1000, // 10 minutes - data considered fresh
      gcTime: 30 * 60 * 1000, // 30 minutes - keep in cache
      retry: (failureCount, error: unknown) => {
        // Don't retry on 4xx errors
        const statusCode = (error as { status?: number })?.status;
        if (statusCode && statusCode >= 400 && statusCode < 500) {
          return false;
        }
        // Retry only once for other errors
        return failureCount < 1;
      },
      refetchOnWindowFocus: false,
      refetchOnMount: false, // Don't refetch if data exists in cache
      refetchOnReconnect: 'always',
      networkMode: 'offlineFirst', // Use cache first
    },
    mutations: {
      // Global mutation options
      retry: false,
      networkMode: 'offlineFirst',
      onError: (error: unknown) => {
        console.error('Mutation error:', error);
      },
    },
  },
});

interface QueryProviderProps {
  children: ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}