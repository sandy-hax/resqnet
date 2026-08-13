import { useMemo, useState } from 'react';
import { Filter } from 'lucide-react';
import { useLiveSos } from '@/hooks/useLiveSos';
import LiveSosTable from '@/components/LiveSosTable';
import SosInspectionModal from '@/components/SosInspectionModal';
import { ErrorBlock } from '@/components/Feedback';
import { EmergencyTypeTag } from '@/components/Badges';
import type { SOSDetail, SOSPriority, SOSStatus } from '@/types';

const STATUS_FILTERS: Array<{ value: SOSStatus | 'ALL'; label: string }> = [
  { value: 'ALL', label: 'All statuses' },
  { value: 'SUBMITTED', label: 'Submitted' },
  { value: 'VERIFIED', label: 'Verified (to dispatch)' },
  { value: 'ASSIGNED', label: 'Assigned' },
  { value: 'RESPONDER_ON_WAY', label: 'Responder on way' },
  { value: 'ASSISTANCE_PROVIDED', label: 'Assistance provided' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'REJECTED', label: 'Rejected' },
];

const PRIORITY_FILTERS: Array<{ value: SOSPriority | 'ALL'; label: string }> = [
  { value: 'ALL', label: 'All priorities' },
  { value: 'HIGH', label: 'High' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'LOW', label: 'Low' },
];

export default function SosVerification() {
  const { items, isLoading, isError, refetch } = useLiveSos();
  const [selected, setSelected] = useState<SOSDetail | null>(null);
  const [statusFilter, setStatusFilter] = useState<SOSStatus | 'ALL'>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<SOSPriority | 'ALL'>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  const types = useMemo(
    () => Array.from(new Set(items.map((s) => s.emergency_type))).sort(),
    [items],
  );

  const filtered = useMemo(() => {
    return items.filter((s) => {
      if (statusFilter !== 'ALL' && s.status !== statusFilter) return false;
      if (priorityFilter !== 'ALL' && s.priority !== priorityFilter) return false;
      if (typeFilter !== 'ALL' && s.emergency_type !== typeFilter) return false;
      return true;
    });
  }, [items, statusFilter, priorityFilter, typeFilter]);

  const pending = items.filter((s) => s.status === 'SUBMITTED').length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="mr-2 flex items-center gap-1.5 text-xs font-semibold text-muted">
          <Filter size={14} /> Filters
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as SOSStatus | 'ALL')}
          className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs font-medium outline-none focus:border-primary"
        >
          {STATUS_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value as SOSPriority | 'ALL')}
          className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs font-medium outline-none focus:border-primary"
        >
          {PRIORITY_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs font-medium outline-none focus:border-primary"
        >
          <option value="ALL">All emergency types</option>
          {types.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>

        <div className="ml-auto flex items-center gap-2 text-[11px] font-semibold text-muted">
          <span className="rounded-full bg-dangerLight px-2.5 py-1 text-danger">
            {pending} awaiting verification
          </span>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">
            {filtered.length} shown
          </span>
        </div>
      </div>

      {isError ? (
        <div className="rounded-xl border border-border bg-surface shadow-card">
          <ErrorBlock message="Could not load the SOS queue." onRetry={() => refetch()} />
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-surface shadow-card">
          <LiveSosTable sosList={filtered} loading={isLoading} onSelect={setSelected} />
        </div>
      )}

      {typeFilter !== 'ALL' && (
        <div className="flex items-center gap-2 text-xs text-muted">
          Active type filter: <EmergencyTypeTag type={typeFilter} />
        </div>
      )}

      <SosInspectionModal sos={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
