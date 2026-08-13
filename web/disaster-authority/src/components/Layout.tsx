import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '@/components/Sidebar';
import Topbar from '@/components/Topbar';
import { useLiveSos } from '@/hooks/useLiveSos';

const titles: Record<string, { title: string; subtitle: string }> = {
  '/': { title: 'Command Overview', subtitle: 'Live operational picture of the district' },
  '/sos': { title: 'SOS Verification & Dispatch', subtitle: 'Inspect, verify and direct response teams' },
  '/content': { title: 'Awareness & Preparedness', subtitle: 'Publish campaigns, guides and regional broadcasts' },
  '/teams': { title: 'Disaster Management Teams', subtitle: 'Registered responder units directory' },
  '/reports': { title: 'System Reports & Analytics', subtitle: 'Operational intelligence & performance metrics' },
};

export default function Layout() {
  const location = useLocation();
  const { wsConnected } = useLiveSos();
  const meta = titles[location.pathname] ?? { title: 'Command Center', subtitle: '' };

  return (
    <div className="flex h-screen overflow-hidden bg-bg">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar title={meta.title} subtitle={meta.subtitle} wsConnected={wsConnected} />
        <main className="flex-1 overflow-y-auto px-6 py-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
