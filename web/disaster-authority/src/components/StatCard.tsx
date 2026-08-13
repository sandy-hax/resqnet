import clsx from 'clsx';
import type { ReactNode } from 'react';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: ReactNode;
  accent?: 'primary' | 'danger' | 'warning' | 'success' | 'slate';
  sub?: string;
  delta?: number | null;
  live?: boolean;
}

const accentMap: Record<NonNullable<StatCardProps['accent']>, string> = {
  primary: 'bg-primaryLight text-primary',
  danger: 'bg-dangerLight text-danger',
  warning: 'bg-warningLight text-[#B26F00]',
  success: 'bg-successLight text-success',
  slate: 'bg-slate-100 text-slate-500',
};

export default function StatCard({ label, value, icon, accent = 'primary', sub, delta, live }: StatCardProps) {
  const deltaUp = (delta ?? 0) >= 0;
  return (
    <div className="relative rounded-xl border border-border bg-surface p-4 shadow-card">
      {live && (
        <span className="absolute right-3 top-3 flex items-center gap-1 text-[10px] font-semibold text-success">
          <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
          LIVE
        </span>
      )}
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs font-medium text-muted">{label}</div>
          <div className="mt-1 text-2xl font-bold tracking-tight text-text">{value}</div>
        </div>
        <div className={clsx('flex h-9 w-9 items-center justify-center rounded-lg', accentMap[accent])}>
          {icon}
        </div>
      </div>
      {(sub || delta !== undefined) && (
        <div className="mt-2 flex items-center gap-2 text-xs">
          {delta !== undefined && delta !== null && (
            <span className={clsx('flex items-center font-semibold', deltaUp ? 'text-success' : 'text-danger')}>
              {deltaUp ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
              {Math.abs(delta)}%
            </span>
          )}
          {sub && <span className="text-muted">{sub}</span>}
        </div>
      )}
    </div>
  );
}
