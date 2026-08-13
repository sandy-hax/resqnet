import clsx from 'clsx';
import type { ReactNode } from 'react';

export function Spinner({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <svg
      className={clsx('animate-spin text-primary', className)}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-label="Loading"
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-20" />
      <path
        fill="currentColor"
        d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z"
        className="opacity-90"
      />
    </svg>
  );
}

export function LoadingBlock({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-muted">
      <Spinner />
      <span className="text-sm">{label}</span>
    </div>
  );
}

export function ErrorBlock({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-10 text-muted">
      <div className="text-danger text-sm font-medium">Failed to load data</div>
      <div className="text-xs max-w-md text-center">{message}</div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-xs font-medium text-primary border border-primary/30 rounded-md px-3 py-1.5 hover:bg-primaryLight transition-colors"
        >
          Retry
        </button>
      )}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  hint,
}: {
  icon?: ReactNode;
  title: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      {icon && <div className="mb-3 text-slate-300">{icon}</div>}
      <div className="text-sm font-medium text-slate-600">{title}</div>
      {hint && <div className="text-xs text-muted mt-1 max-w-sm">{hint}</div>}
    </div>
  );
}
