import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchSos } from '@/lib/api';
import type { SOSDetail, WsMessage } from '@/types';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useAuth } from '@/context/AuthContext';

export const sosQueryKey = ['sos'] as const;

/**
 * Live SOS feed for the command center.
 * - Initial load + background refetch every 30s (catches missed events).
 * - WebSocket push invalidates the feed on `sos.created`,
 *   `sos.status_changed` and `assignment.responded` so the queue,
 *   metrics and map update in near-real-time.
 */
export function useLiveSos() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const { connected, subscribe } = useWebSocket(token);

  useEffect(() => {
    const handle = (msg: WsMessage) => {
      if (['sos.created', 'sos.status_changed', 'assignment.responded'].includes(msg.event)) {
        queryClient.invalidateQueries({ queryKey: sosQueryKey });
      }
    };
    return subscribe(handle);
  }, [subscribe, queryClient]);

  const query = useQuery({
    queryKey: sosQueryKey,
    queryFn: fetchSos,
    refetchInterval: 30_000,
    refetchOnWindowFocus: false,
    retry: 2,
  });

  const items: SOSDetail[] = query.data ?? [];

  const active = items.filter((s) => !['RESOLVED', 'REJECTED'].includes(s.status));
  const highPriority = active.filter((s) => s.priority === 'HIGH');

  const byId = new Map<string, SOSDetail>(items.map((s) => [s.sos_id, s]));

  return {
    items,
    active,
    highPriority,
    byId,
    isLoading: query.isLoading,
    isError: query.isError,
    isFetching: query.isFetching,
    refetch: query.refetch,
    wsConnected: connected,
  };
}
