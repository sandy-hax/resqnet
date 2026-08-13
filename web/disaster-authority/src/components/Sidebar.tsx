import { NavLink } from 'react-router-dom';
import {
  Activity,
  LayoutDashboard,
  LifeBuoy,
  Megaphone,
  Radio,
  ShieldAlert,
  Siren,
  Users,
} from 'lucide-react';
import clsx from 'clsx';
import { useLiveSos } from '@/hooks/useLiveSos';

const navItems = [
  { to: '/', label: 'Command Overview', icon: LayoutDashboard, end: true },
  { to: '/sos', label: 'SOS Verification', icon: Siren, end: false },
  { to: '/content', label: 'Awareness & Campaigns', icon: Megaphone, end: false },
  { to: '/teams', label: 'Response Teams', icon: Users, end: false },
  { to: '/reports', label: 'Reports & Analytics', icon: Activity, end: false },
];

export default function Sidebar() {
  const { active, wsConnected } = useLiveSos();

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col bg-sidebar text-slate-300">
      <div className="flex items-center gap-3 border-b border-white/10 px-5 py-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white">
          <ShieldAlert size={22} />
        </div>
        <div>
          <div className="text-sm font-bold leading-tight text-white">Raksha Link</div>
          <div className="text-[10px] font-medium uppercase tracking-widest text-slate-400">
            Command Center
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              clsx(
                'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-colors',
                isActive
                  ? 'bg-primary text-white shadow-[inset_0_1px_0_rgba(255,255,255,.12)]'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white',
              )
            }
          >
            <item.icon size={17} className="shrink-0" />
            <span className="flex-1">{item.label}</span>
            {item.to === '/sos' && active.length > 0 && (
              <span className="rounded-full bg-danger px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                {active.length}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-white/10 px-5 py-4">
        <div className="flex items-center gap-2 text-[11px]">
          <Radio size={13} className={clsx(wsConnected ? 'text-success' : 'text-warning')} />
          <span className="font-medium text-slate-400">
            {wsConnected ? 'Live telemetry connected' : 'Reconnecting stream…'}
          </span>
        </div>
        <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-500">
          <LifeBuoy size={13} />
          District Command Ops · 24×7
        </div>
      </div>
    </aside>
  );
}
