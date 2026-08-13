import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchTeams } from '@/lib/api';
import type { TeamOut, TeamLocationUpdate, WsMessage } from '@/types';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useAuth } from '@/context/AuthContext';

export const teamsQueryKey = ['teams'] as const;

/**
 * Live responder-teams feed for the command center.
 * - Polls every 60s as a safety net (in case a WebSocket frame is missed).
 * - On `team.location_updated` (pushed by the backend when a duty team syncs
 *   its GPS every 5 minutes) patches the matching team in the query cache
 *   immediately, so the map / directory track responders without a refetch.
 */
export function useLiveTeams() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const { subscribe } = useWebSocket(token);

  useEffect(() => {
    const handle = (msg: WsMessage) => {
      if (msg.event !== 'team.location_updated') return;
      const update = msg.data as unknown as TeamLocationUpdate;
      queryClient.setQueryData<TeamOut[]>(teamsQueryKey, (teams) => {
        if (!teams) return teams;
        return teams.map((t) =>
          t.team_id === update.team_id
            ? {
                ...t,
                is_available: update.is_available,
                current_lat: update.lat,
                current_lng: update.lng,
                location_updated_at: update.location_updated_at,
              }
            : t,
        );
      });
    };
    return subscribe(handle);
  }, [subscribe, queryClient]);

  const query = useQuery({
    queryKey: teamsQueryKey,
    queryFn: fetchTeams,
    refetchInterval: 60_000,
    staleTime: 10_000,
    refetchOnWindowFocus: false,
    retry: 2,
  });

  return {
    teams: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    isFetching: query.isFetching,
    refetch: query.refetch,
  };
}