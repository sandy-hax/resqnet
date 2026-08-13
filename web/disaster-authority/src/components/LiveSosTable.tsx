import { Inbox } from 'lucide-react';
import type { SOSDetail } from '@/types';
import { EmergencyTypeTag, PriorityBadge, StatusBadge } from '@/components/Badges';
import { EmptyState, LoadingBlock } from '@/components/Feedback';
import { timeAgo } from '@/lib/format';

interface LiveSosTableProps {
  sosList: SOSDetail[];
  loading?: boolean;
  onSelect: (sos: SOSDetail) => void;
  compact?: boolean;
}

export default function LiveSosTable({ sosList, loading, onSelect, compact }: LiveSosTableProps) {
  if (loading) return <LoadingBlock label="Loading live SOS queue…" />;
  if (sosList.length === 0) {
    return (
      <EmptyState
        icon={<Inbox size={36} />}
        title="No distress calls in the queue"
        hint="Incoming SOS entries appear here instantly over the live WebSocket stream."
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-border text-[11px] uppercase tracking-wider text-muted">
            <th className="px-3 py-2.5 font-semibold">ID</th>
            <th className="px-3 py-2.5 font-semibold">Type</th>
            <th className="px-3 py-2.5 font-semibold">Priority</th>
            <th className="px-3 py-2.5 font-semibold">Status</th>
            {!compact && <th className="px-3 py-2.5 font-semibold">Requester</th>}
            {!compact && <th className="px-3 py-2.5 font-semibold">Affected</th>}
            <th className="px-3 py-2.5 font-semibold">Received</th>
            <th className="px-3 py-2.5 font-semibold text-right">Action</th>
          </tr>
        </thead>
        <tbody>
          {sosList.map((sos) => (
            <tr
              key={sos.sos_id}
              onClick={() => onSelect(sos)}
              className="cursor-pointer border-b border-border/70 transition-colors last:border-0 hover:bg-primaryLight/50"
            >
              <td className="px-3 py-2.5 font-mono text-xs font-semibold text-primary">{sos.sos_id}</td>
              <td className="px-3 py-2.5">
                <EmergencyTypeTag type={sos.emergency_type} />
              </td>
              <td className="px-3 py-2.5">
                <PriorityBadge priority={sos.priority} />
              </td>
              <td className="px-3 py-2.5">
                <StatusBadge status={sos.status} />
              </td>
              {!compact && (
                <td className="px-3 py-2.5 text-xs text-slate-700">
                  {sos.guest_name ?? 'Anonymous'}
                  <div className="text-[11px] text-muted">{sos.guest_phone ?? 'Guest SOS'}</div>
                </td>
              )}
              {!compact && <td className="px-3 py-2.5 text-xs text-slate-600">{sos.people_affected}</td>}
              <td className="px-3 py-2.5 text-xs text-muted">{timeAgo(sos.created_at)}</td>
              <td className="px-3 py-2.5 text-right">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect(sos);
                  }}
                  className="rounded-md bg-primaryLight px-2.5 py-1 text-[11px] font-semibold text-primary transition-colors hover:bg-primary hover:text-white"
                >
                  Inspect
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
