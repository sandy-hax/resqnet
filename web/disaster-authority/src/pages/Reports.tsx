import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Clock, GaugeCircle, PieChart as PieIcon, TrendingUp } from 'lucide-react';
import { useLiveSos } from '@/hooks/useLiveSos';
import { fetchAlerts, fetchShelters, fetchTeams } from '@/lib/api';
import { ErrorBlock } from '@/components/Feedback';
import { elapsedMinutes, titleCase } from '@/lib/format';

const DISASTER_COLORS = [
  '#0F6E5C',
  '#E14434',
  '#F5A623',
  '#2E9E5B',
  '#0EA5E9',
  '#8B5CF6',
  '#F97316',
  '#64748B',
];

function tooltipStyle() {
  return {
    contentStyle: {
      borderRadius: 10,
      border: '1px solid #E4E8EF',
      fontSize: 12,
      background: '#fff',
      boxShadow: '0 4px 12px rgba(15,23,42,.08)',
    },
  };
}

export default function Reports() {
  const { items, isLoading, isError, refetch } = useLiveSos();
  const teamsQuery = useQuery({ queryKey: ['teams'], queryFn: fetchTeams, staleTime: 30_000 });
  const alertsQuery = useQuery({ queryKey: ['alerts'], queryFn: fetchAlerts, staleTime: 30_000 });

  const volumeOverTime = useMemo(() => volumeSeries(items), [items]);

  const stats = useMemo(() => {
    const byType = new Map<string, number>();
    for (const s of items) byType.set(s.emergency_type, (byType.get(s.emergency_type) ?? 0) + 1);

    const typeFreq = Array.from(byType.entries())
      .map(([type, count]) => ({ name: titleCase(type), count }))
      .sort((a, b) => b.count - a.count);

    const byStatus = new Map<string, number>();
    for (const s of items) byStatus.set(s.status, (byStatus.get(s.status) ?? 0) + 1);
    const statusDist = Array.from(byStatus.entries()).map(([status, value]) => ({
      name: titleCase(status).replace(/_/g, ' '),
      value,
    }));

    const byPriority = new Map<string, number>();
    for (const s of items) byPriority.set(s.priority, (byPriority.get(s.priority) ?? 0) + 1);
    const priorityDist = Array.from(byPriority.entries()).map(([priority, value]) => ({ name: priority, value }));

    const dispatchByType = new Map<string, number[]>();
    for (const s of items) {
      if (['ASSIGNED', 'RESPONDER_ON_WAY', 'ASSISTANCE_PROVIDED', 'RESOLVED'].includes(s.status)) {
        const mins = elapsedMinutes(s.created_at, s.updated_at);
        if (!dispatchByType.has(s.emergency_type)) dispatchByType.set(s.emergency_type, []);
        dispatchByType.get(s.emergency_type)!.push(mins);
      }
    }
    const dispatchTime = Array.from(dispatchByType.entries())
      .map(([type, vals]) => ({
        name: titleCase(type),
        avgMin: Math.round(vals.reduce((a, b) => a + b, 0) / vals.length),
      }))
      .sort((a, b) => b.avgMin - a.avgMin);

    const resolved = items.filter((s) => s.status === 'RESOLVED');
    const resolutionByType = new Map<string, number[]>();
    for (const s of resolved) {
      const mins = elapsedMinutes(s.created_at, s.updated_at);
      if (!resolutionByType.has(s.emergency_type)) resolutionByType.set(s.emergency_type, []);
      resolutionByType.get(s.emergency_type)!.push(mins);
    }
    const resolutionTime = Array.from(resolutionByType.entries())
      .map(([type, vals]) => ({
        name: titleCase(type),
        avgMin: Math.round(vals.reduce((a, b) => a + b, 0) / vals.length),
      }))
      .sort((a, b) => b.avgMin - a.avgMin);

    return { typeFreq, statusDist, priorityDist, dispatchTime, resolutionTime, volumeOverTime, resolvedCount: resolved.length };
  }, [items, volumeOverTime]);

  const teams = teamsQuery.data ?? [];
  const available = teams.filter((t) => t.is_available).length;
  const busy = teams.length - available;
  const utilizationPct = teams.length > 0 ? Math.round((busy / teams.length) * 100) : 0;

  const teamUtilization = [
    { name: 'Available', value: available, color: '#2E9E5B' },
    { name: 'On assignment', value: busy, color: '#F5A623' },
  ];

  const totalAvgDispatch =
    stats.dispatchTime.length > 0
      ? Math.round(stats.dispatchTime.reduce((a, b) => a + b.avgMin, 0) / stats.dispatchTime.length)
      : 0;

  const totalAvgResolution =
    stats.resolutionTime.length > 0
      ? Math.round(stats.resolutionTime.reduce((a, b) => a + b.avgMin, 0) / stats.resolutionTime.length)
      : 0;

  if (isError) {
    return (
      <div className="rounded-xl border border-border bg-surface shadow-card">
        <ErrorBlock message="Could not load analytics data." onRetry={() => refetch()} />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="grid gap-5 lg:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-64 animate-pulse rounded-xl border border-border bg-surface" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={<TrendingUp size={17} />}
          label="Total Incidents Tracked"
          value={items.length}
          sub={`${stats.resolvedCount} resolved · ${alertsQuery.data?.length ?? 0} alerts`}
        />
        <KpiCard
          icon={<Clock size={17} />}
          label="Avg Time-to-Dispatch"
          value={`${totalAvgDispatch} min`}
          sub="submission → assignment"
        />
        <KpiCard
          icon={<GaugeCircle size={17} />}
          label="Avg Resolution Time"
          value={`${totalAvgResolution} min`}
          sub={`across ${stats.resolutionTime.length} disaster type(s)`}
        />
        <KpiCard
          icon={<PieIcon size={17} />}
          label="Team Utilization"
          value={`${utilizationPct}%`}
          sub={`${busy} busy · ${available} available`}
        />
      </div>

      {/* Charts */}
      <div className="grid gap-5 lg:grid-cols-2">
        <ChartCard title="Emergency Frequency by Disaster Type" subtitle="Count of incoming SOS per hazard category">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={stats.typeFreq} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E4E8EF" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-18} textAnchor="end" height={52} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip {...tooltipStyle()} cursor={{ fill: 'rgba(15,23,42,.04)' }} />
              <Bar dataKey="count" name="Incidents" radius={[6, 6, 0, 0]}>
                {stats.typeFreq.map((entry, i) => (
                  <Cell key={entry.name} fill={DISASTER_COLORS[i % DISASTER_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="SOS Volume Over Time" subtitle="Incidents created per day (last 14 days)">
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={stats.volumeOverTime} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id="vol" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0F6E5C" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#0F6E5C" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E4E8EF" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip {...tooltipStyle()} />
              <Area type="monotone" dataKey="count" name="Incidents" stroke="#0F6E5C" strokeWidth={2} fill="url(#vol)" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Average Time-to-Dispatch by Type" subtitle="Minutes from submission to team assignment">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={stats.dispatchTime} layout="vertical" margin={{ top: 8, right: 16, left: 12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E4E8EF" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} unit="m" />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={92} />
              <Tooltip {...tooltipStyle()} cursor={{ fill: 'rgba(15,23,42,.04)' }} />
              <Bar dataKey="avgMin" name="Avg minutes" radius={[0, 6, 6, 0]} fill="#E14434" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Average Resolution Time by Type" subtitle="Minutes from submission to RESOLVED">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={stats.resolutionTime} layout="vertical" margin={{ top: 8, right: 16, left: 12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E4E8EF" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} unit="m" />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={92} />
              <Tooltip {...tooltipStyle()} cursor={{ fill: 'rgba(15,23,42,.04)' }} />
              <Bar dataKey="avgMin" name="Avg minutes" radius={[0, 6, 6, 0]} fill="#2E9E5B" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Incident Status Distribution" subtitle="Current state of all tracked SOS entries">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={stats.statusDist} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={48} paddingAngle={2} label>
                {stats.statusDist.map((entry, i) => (
                  <Cell key={entry.name} fill={DISASTER_COLORS[i % DISASTER_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip {...tooltipStyle()} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Team Resource Utilization" subtitle="Available vs on-assignment responder units">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={teamUtilization} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={48} paddingAngle={2} label>
                {teamUtilization.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip {...tooltipStyle()} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <p className="text-[11px] text-muted">
        Analytics are computed client-side from the live SOS feed, teams directory and alert log. Average
        time-to-dispatch/resolution are approximated from SOS creation and last-updated timestamps.
      </p>
    </div>
  );
}

function volumeSeries(items: { created_at: string }[]) {
  const counts = new Map<string, number>();
  for (const s of items) {
    try {
      const day = new Date(s.created_at).toISOString().slice(0, 10);
      counts.set(day, (counts.get(day) ?? 0) + 1);
    } catch {
      // ignore unparseable dates
    }
  }
  const days = Array.from(counts.keys()).sort().slice(-14);
  const min = new Date(new Date().setDate(new Date().getDate() - 13)).toISOString().slice(0, 10);
  const fullRange: string[] = [];
  for (let d = new Date(min); fullRange.length < 14; d = new Date(d.getTime() + 86400000)) {
    fullRange.push(d.toISOString().slice(0, 10));
  }
  return fullRange.map((day) => ({
    day: day.slice(5),
    count: counts.get(day) ?? 0,
  }));
}

function KpiCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string | number; sub: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4 shadow-card">
      <div className="flex items-center justify-between">
        <div className="text-xs font-medium text-muted">{label}</div>
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primaryLight text-primary">{icon}</span>
      </div>
      <div className="mt-1 text-2xl font-bold tracking-tight text-text">{value}</div>
      <div className="mt-0.5 text-[11px] text-muted">{sub}</div>
    </div>
  );
}

function ChartCard({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4 shadow-card">
      <h3 className="text-sm font-bold text-text">{title}</h3>
      <p className="mb-3 text-[11px] text-muted">{subtitle}</p>
      {children}
    </div>
  );
}
