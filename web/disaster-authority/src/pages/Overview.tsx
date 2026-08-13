import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Radio, Siren, Users } from 'lucide-react';
import StatCard from '@/components/StatCard';
import IncidentMap from '@/components/IncidentMap';
import LiveSosTable from '@/components/LiveSosTable';
import SosInspectionModal from '@/components/SosInspectionModal';
import { ErrorBlock } from '@/components/Feedback';
import { useLiveSos } from '@/hooks/useLiveSos';
import { useLiveTeams } from '@/hooks/useLiveTeams';
import { fetchAlerts, fetchShelters } from '@/lib/api';
import type { SOSDetail } from '@/types';

export default function Overview() {
  const { items, active, highPriority, isLoading, isError, refetch } = useLiveSos();
  const [selected, setSelected] = useState<SOSDetail | null>(null);

  const { teams } = useLiveTeams();
  const sheltersQuery = useQuery({ queryKey: ['shelters'], queryFn: fetchShelters, staleTime: 30_000 });
  const alertsQuery = useQuery({ queryKey: ['alerts'], queryFn: fetchAlerts, staleTime: 30_000 });

  const teamsOnDuty = teams.filter((t) => t.is_available).length;

  return (
    <div className="space-y-6">
      {/* Metric cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Active SOS Count"
          value={active.length}
          icon={<Siren size={18} />}
          accent="danger"
          live
          sub="open distress calls"
        />
        <StatCard
          label="High Priority Emergencies"
          value={highPriority.length}
          icon={<AlertTriangle size={18} />}
          accent="warning"
          sub="requiring immediate dispatch"
        />
        <StatCard
          label="Teams On Duty"
          value={`${teamsOnDuty}/${teams.length}`}
          icon={<Users size={18} />}
          accent="success"
          sub="available response units"
        />
        <StatCard
          label="Published Regional Alerts"
          value={alertsQuery.data?.length ?? 0}
          icon={<Radio size={18} />}
          accent="primary"
          sub="broadcast to citizen apps"
        />
      </div>

      {/* Live map */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-bold text-text">Live Incident Map</h2>
          <span className="text-[11px] text-muted">
            {items.length} SOS · {teams.length} teams · {sheltersQuery.data?.length ?? 0} shelters
          </span>
        </div>
        <IncidentMap
          sosList={items}
          teams={teams}
          shelters={sheltersQuery.data ?? []}
          selectedSosId={selected?.sos_id ?? null}
          onSelectSos={setSelected}
        />
      </div>

      {/* Dynamic emergency table */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-bold text-text">Dynamic Emergency Queue</h2>
          <span className="text-[11px] text-muted">Auto-updates via WebSocket · click to inspect</span>
        </div>
        <div className="rounded-xl border border-border bg-surface shadow-card">
          {isError ? (
            <ErrorBlock message="Could not load the SOS queue." onRetry={() => refetch()} />
          ) : (
            <LiveSosTable sosList={items} loading={isLoading} onSelect={setSelected} />
          )}
        </div>
      </div>

      <SosInspectionModal sos={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
