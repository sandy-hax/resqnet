import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Award, BadgeCheck, MapPin, Phone, Plus, Users } from 'lucide-react';
import clsx from 'clsx';
import StatCard from '@/components/StatCard';
import IncidentMap from '@/components/IncidentMap';
import AddTeamModal from '@/components/AddTeamModal';
import { EmergencyTypeTag } from '@/components/Badges';
import { ErrorBlock, LoadingBlock } from '@/components/Feedback';
import { fetchShelters } from '@/lib/api';
import { useLiveSos } from '@/hooks/useLiveSos';
import { useLiveTeams } from '@/hooks/useLiveTeams';
import { timeAgo, titleCase } from '@/lib/format';

const experienceBadge: Record<string, string> = {
  ADVANCED: 'bg-primaryLight text-primary',
  INTERMEDIATE: 'bg-sky-100 text-sky-700',
  BASIC: 'bg-slate-100 text-slate-600',
};

export default function TeamsDirectory() {
  const { items: sosList, isLoading: sosLoading } = useLiveSos();
  const queryClient = useQueryClient();
  const { teams, isLoading: teamsLoading, isError: teamsError, refetch: refetchTeams } = useLiveTeams();
  const sheltersQuery = useQuery({ queryKey: ['shelters'], queryFn: fetchShelters, staleTime: 60_000 });
  const [filter, setFilter] = useState<'ALL' | 'AVAILABLE' | 'BUSY'>('ALL');
  const [showAdd, setShowAdd] = useState(false);

  const activeAssignments = useMemo(() => {
    const counts = new Map<string, number>();
    for (const sos of sosList) {
      const name = sos.assigned_team?.team_name;
      if (!name) continue;
      if (['RESOLVED', 'REJECTED'].includes(sos.status)) continue;
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
    return counts;
  }, [sosList]);

  const filtered = useMemo(() => {
    if (filter === 'ALL') return teams;
    return teams.filter((t) => (filter === 'AVAILABLE' ? t.is_available : !t.is_available));
  }, [teams, filter]);

  const available = teams.filter((t) => t.is_available).length;
  const deployed = teams.filter((t) => !t.is_available).length;
  const activeCount = Array.from(activeAssignments.values()).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Registered Units"
          value={teams.length}
          icon={<Users size={18} />}
          accent="primary"
          sub="disaster management teams"
        />
        <StatCard
          label="Available On Duty"
          value={available}
          icon={<BadgeCheck size={18} />}
          accent="success"
          sub="ready for dispatch"
        />
        <StatCard
          label="Active Assignments"
          value={activeCount}
          icon={<Award size={18} />}
          accent="warning"
          sub="across responder units"
        />
      </div>

      {teamsError ? (
        <ErrorBlock message="Could not load the teams directory." onRetry={() => refetchTeams()} />
      ) : teamsLoading ? (
        <LoadingBlock label="Loading teams directory…" />
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex rounded-lg border border-border bg-surface p-1">
                {(['ALL', 'AVAILABLE', 'BUSY'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={clsx(
                      'rounded-md px-3 py-1.5 text-xs font-semibold transition-colors',
                      filter === f ? 'bg-primary text-white' : 'text-muted hover:text-text',
                    )}
                  >
                    {f === 'ALL' ? 'All' : f === 'AVAILABLE' ? 'Available' : 'Busy'}
                  </button>
                ))}
              </div>
              <span className="text-[11px] text-muted">{filtered.length} teams shown</span>
              <button
                onClick={() => setShowAdd(true)}
                className="ml-auto flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-primaryDark"
              >
                <Plus size={14} /> Add team
              </button>
            </div>

            <AddTeamModal
              open={showAdd}
              onClose={() => setShowAdd(false)}
              onCreated={() => queryClient.invalidateQueries({ queryKey: ['teams'] })}
            />

            {filtered.map((team) => {
              const assignments = activeAssignments.get(team.team_name) ?? 0;
              return (
                <div
                  key={team.team_id}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-surface p-4 shadow-card"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sidebar text-white">
                      <Users size={18} />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold text-text">{team.team_name}</span>
                        <span className="font-mono text-[11px] text-muted">{team.badge_number}</span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        {team.specialization.map((s) => (
                          <EmergencyTypeTag key={s} type={s} />
                        ))}
                        <span
                          className={clsx(
                            'rounded-full px-2 py-0.5 text-[10px] font-bold',
                            experienceBadge[team.experience_level] ?? 'bg-slate-100 text-slate-600',
                          )}
                        >
                          {titleCase(team.experience_level)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-muted">
                    {team.current_lat != null && team.current_lng != null && (
                      <span className="flex items-center gap-1">
                        <MapPin size={13} />
                        {team.current_lat.toFixed(4)}, {team.current_lng.toFixed(4)}
                        {team.location_updated_at && (
                          <span className="text-[10px] text-muted">
                            · synced {timeAgo(team.location_updated_at)}
                          </span>
                        )}
                      </span>
                    )}
                    {team.contact_phone && (
                      <span className="flex items-center gap-1">
                        <Phone size={13} />
                        {team.contact_phone}
                      </span>
                    )}
                    <span
                      className={clsx(
                        'rounded-full px-2.5 py-1 text-[11px] font-bold',
                        team.is_available ? 'bg-successLight text-success' : 'bg-warningLight text-[#B26F00]',
                      )}
                    >
                      {team.is_available ? '● Available' : '○ On assignment'}
                    </span>
                    {assignments > 0 && (
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">
                        {assignments} active dispatch{assignments > 1 ? 'es' : ''}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}

            {filtered.length === 0 && (
              <div className="rounded-xl border border-border bg-surface p-8 text-center text-sm text-muted">
                No teams match the current filter.
              </div>
            )}
          </div>

          <div>
            <div className="mb-2 text-sm font-bold text-text">Team Deployment Map</div>
            <IncidentMap
              sosList={sosList}
              teams={teams}
              shelters={sheltersQuery.data ?? []}
              height={520}
            />
            {sosLoading && <LoadingBlock label="Syncing SOS telemetry…" />}
          </div>
        </div>
      )}
    </div>
  );
}
