import { LogOut, ShieldCheck, Wifi, WifiOff } from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';

interface TopbarProps {
  title: string;
  subtitle?: string;
  wsConnected: boolean;
}

export default function Topbar({ title, subtitle, wsConnected }: TopbarProps) {
  const { user, logout } = useAuth();
  const toast = useToast();

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-bg/90 px-6 py-3.5 backdrop-blur">
      <div>
        <h1 className="text-lg font-bold tracking-tight text-text">{title}</h1>
        {subtitle && <p className="text-xs text-muted">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-4">
        <div
          className={clsx(
            'flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold',
            wsConnected
              ? 'border-success/30 bg-successLight text-success'
              : 'border-warning/40 bg-warningLight text-[#B26F00]',
          )}
        >
          {wsConnected ? <Wifi size={12} /> : <WifiOff size={12} />}
          {wsConnected ? 'Live' : 'Offline'}
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sidebar text-white">
            <ShieldCheck size={17} />
          </div>
          <div className="hidden sm:block">
            <div className="text-[13px] font-semibold leading-tight text-text">
              {user?.name ?? 'Authority'}
            </div>
            <div className="text-[11px] text-muted">AUTHORITY · Dispatcher</div>
          </div>
        </div>

        <button
          onClick={() => {
            logout();
            toast.info('Signed out', 'Authority session closed.');
          }}
          className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-muted transition-colors hover:border-danger/40 hover:text-danger"
        >
          <LogOut size={14} />
          Sign out
        </button>
      </div>
    </header>
  );
}
