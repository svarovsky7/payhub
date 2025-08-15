import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { contractorApi } from '@/entities/contractor';
import { payerApi } from '@/entities/payer';
import { projectApi } from '@/entities/project';

/**
 * Hook to prefetch common data that's used across multiple pages
 * This reduces loading time when navigating between pages
 */
export function usePrefetchCommonData() {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Prefetch contractors
    queryClient.prefetchQuery({
      queryKey: ['contractors'],
      queryFn: contractorApi.getAll,
      staleTime: 15 * 60 * 1000, // 15 minutes
    });

    // Prefetch payers
    queryClient.prefetchQuery({
      queryKey: ['payers'],
      queryFn: payerApi.getAll,
      staleTime: 15 * 60 * 1000, // 15 minutes
    });

    // Prefetch projects
    queryClient.prefetchQuery({
      queryKey: ['projects'],
      queryFn: projectApi.getAll,
      staleTime: 15 * 60 * 1000, // 15 minutes
    });
  }, [queryClient]);
}