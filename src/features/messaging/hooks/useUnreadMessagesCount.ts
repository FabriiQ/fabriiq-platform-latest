/**
 * Hook for real-time unread message counting with role context
 * Optimized for performance with caching and feature flag support
 */

import { useSession } from 'next-auth/react';
import { api } from '@/utils/api';
import { isFeatureEnabled } from '@/lib/feature-flags';

export interface UnreadMessagesCount {
  count: number;
}

export function useUnreadMessagesCount() {
  const { data: session } = useSession();

  // Only fetch if messaging is enabled and user is authenticated
  const enabled = isFeatureEnabled('MESSAGING_ENABLED') && !!session?.user;

  const { data, isLoading, error } = api.messaging.getUnreadCount.useQuery(
    {},
    {
      enabled,
      refetchInterval: 30000, // 30 seconds
      staleTime: 15000, // 15 seconds
      cacheTime: 60000, // 1 minute
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    }
  );

  return {
    unreadCount: data || { count: 0 },
    isLoading,
    error,
    isEnabled: enabled,
  };
}
