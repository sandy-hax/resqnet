import clsx from 'clsx';
import type { AssignmentStatus, SOSPriority, SOSStatus } from '@/types';
import { priorityColor, statusStyles, titleCase } from '@/lib/format';

export function PriorityBadge({ priority }: { priority: SOSPriority }) {
  const s = priorityColor[priority];
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap',
        s.badge,
      )}
    >
      <span className={clsx('h-1.5 w-1.5 rounded-full', s.dot, priority === 'HIGH' && 'animate-pulse')} />
      {priority}
    </span>
  );
}

export function StatusBadge({ status }: { status: SOSStatus | AssignmentStatus }) {
  const s = statusStyles[status];
  return (
    <span className={clsx('inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap', s.badge)}>
      {s.label}
    </span>
  );
}

export function EmergencyTypeTag({ type }: { type: string }) {
  return (
    <span className="inline-flex items-center rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-700">
      {titleCase(type)}
    </span>
  );
}
