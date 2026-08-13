import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  BookOpenCheck,
  Megaphone,
  Newspaper,
  Send,
} from 'lucide-react';
import clsx from 'clsx';
import { fetchAlerts, fetchContent, publishAlert, publishAwareness, publishPreparedness } from '@/lib/api';
import { EmergencyTypeTag } from '@/components/Badges';
import { EmptyState, LoadingBlock } from '@/components/Feedback';
import { useToast } from '@/components/Toast';
import { EMERGENCY_TYPES, REGIONAL_AREAS, formatDateTime } from '@/lib/format';
import type { AlertSeverity } from '@/types';

type Tab = 'awareness' | 'programs' | 'alerts';

const severityStyles: Record<AlertSeverity, string> = {
  HIGH: 'bg-dangerLight text-danger',
  MEDIUM: 'bg-warningLight text-[#B26F00]',
  LOW: 'bg-slate-100 text-slate-600',
};

function contentFormInputs(
  disasterType: string,
  setDisasterType: (v: string) => void,
  title: string,
  setTitle: (v: string) => void,
  body: string,
  setBody: (v: string) => void,
  targetArea: string,
  setTargetArea: (v: string) => void,
  mediaUrl: string,
  setMediaUrl: (v: string) => void,
) {
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-semibold text-text">Disaster type</label>
          <select
            value={disasterType}
            onChange={(e) => setDisasterType(e.target.value)}
            className="w-full rounded-lg border border-border bg-bg px-2.5 py-2 text-sm outline-none focus:border-primary"
          >
            {EMERGENCY_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-text">Target region</label>
          <select
            value={targetArea}
            onChange={(e) => setTargetArea(e.target.value)}
            className="w-full rounded-lg border border-border bg-bg px-2.5 py-2 text-sm outline-none focus:border-primary"
          >
            <option value="">All districts</option>
            {REGIONAL_AREAS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold text-text">Title</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          placeholder="e.g. Cyclone Preparedness: 72-Hour Survival Kit Checklist"
          className="w-full rounded-lg border border-border bg-bg px-2.5 py-2 text-sm outline-none focus:border-primary"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold text-text">Body / guidelines</label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          required
          rows={5}
          placeholder="Write Before / During / After guidelines, safety protocols, participation details…"
          className="w-full rounded-lg border border-border bg-bg px-2.5 py-2 text-sm outline-none focus:border-primary"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold text-text">
          Media URL <span className="font-normal text-muted">(optional)</span>
        </label>
        <input
          value={mediaUrl}
          onChange={(e) => setMediaUrl(e.target.value)}
          placeholder="https://…/poster.png or campaign link"
          className="w-full rounded-lg border border-border bg-bg px-2.5 py-2 text-sm outline-none focus:border-primary"
        />
      </div>
    </div>
  );
}

export default function ContentManagement() {
  const toast = useToast();
  const queryClient = useQueryClient();

  const [tab, setTab] = useState<Tab>('awareness');

  const contentQuery = useQuery({ queryKey: ['content'], queryFn: fetchContent, staleTime: 15_000 });
  const alertsQuery = useQuery({ queryKey: ['alerts'], queryFn: fetchAlerts, staleTime: 15_000 });

  const [awareness, setAwareness] = useState({ disasterType: 'FLOOD', title: '', body: '', targetArea: '', mediaUrl: '' });
  const [program, setProgram] = useState({ disasterType: 'FLOOD', title: '', body: '', targetArea: '', mediaUrl: '' });
  const [alert, setAlert] = useState({ title: '', message: '', severity: 'HIGH' as AlertSeverity, targetArea: '' });

  const awarenessMut = useMutation({
    mutationFn: publishAwareness,
    onSuccess: (res) => {
      toast.success('Awareness campaign published', res.title);
      queryClient.invalidateQueries({ queryKey: ['content'] });
      setAwareness({ ...awareness, title: '', body: '', mediaUrl: '' });
    },
    onError: () => toast.error('Publish failed', 'Check backend connectivity.'),
  });

  const programMut = useMutation({
    mutationFn: publishPreparedness,
    onSuccess: (res) => {
      toast.success('Preparedness program broadcast', `Invited citizens in "${res.target_area ?? 'all districts'}"`);
      queryClient.invalidateQueries({ queryKey: ['content'] });
      setProgram({ ...program, title: '', body: '', mediaUrl: '' });
    },
    onError: () => toast.error('Publish failed', 'Check backend connectivity.'),
  });

  const alertMut = useMutation({
    mutationFn: publishAlert,
    onSuccess: (res) => {
      toast.success('Regional alert broadcast', `${res.severity} alert sent to citizens`);
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      setAlert({ title: '', message: '', severity: 'HIGH', targetArea: '' });
    },
    onError: () => toast.error('Broadcast failed', 'Check backend connectivity.'),
  });

  const content = contentQuery.data ?? [];
  const alerts = alertsQuery.data ?? [];

  const awarenessList = useMemo(() => content.filter((c) => !c.is_program), [content]);
  const programList = useMemo(() => content.filter((c) => c.is_program), [content]);

  const tabs: Array<{ key: Tab; label: string; icon: typeof Newspaper; count: number }> = [
    { key: 'awareness', label: 'Awareness Campaigns', icon: Newspaper, count: awarenessList.length },
    { key: 'programs', label: 'Preparedness Guides', icon: BookOpenCheck, count: programList.length },
    { key: 'alerts', label: 'Regional Broadcasts', icon: Megaphone, count: alerts.length },
  ];

  return (
    <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
      {/* Creation suite */}
      <div className="space-y-5">
        <div className="rounded-xl border border-border bg-surface shadow-card">
          <div className="flex border-b border-border">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={clsx(
                  'flex flex-1 items-center justify-center gap-1.5 px-2 py-3 text-xs font-semibold transition-colors',
                  tab === t.key
                    ? 'border-b-2 border-primary text-primary'
                    : 'text-muted hover:text-text',
                )}
              >
                <t.icon size={14} />
                {t.label}
                <span className="rounded-full bg-slate-100 px-1.5 text-[10px] text-slate-500">{t.count}</span>
              </button>
            ))}
          </div>
          <div className="p-4">
            {tab === 'awareness' && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  awarenessMut.mutate({
                    disaster_type: awareness.disasterType,
                    title: awareness.title,
                    body: awareness.body,
                    target_area: awareness.targetArea || undefined,
                    media_url: awareness.mediaUrl || undefined,
                  });
                }}
                className="space-y-3"
              >
                <div className="flex items-center gap-2">
                  <Newspaper size={15} className="text-primary" />
                  <div>
                    <div className="text-sm font-bold text-text">New Awareness Campaign</div>
                    <div className="text-[11px] text-muted">Publish safety protocols & guidance to citizens.</div>
                  </div>
                </div>
                {contentFormInputs(
                  awareness.disasterType,
                  (v) => setAwareness({ ...awareness, disasterType: v }),
                  awareness.title,
                  (v) => setAwareness({ ...awareness, title: v }),
                  awareness.body,
                  (v) => setAwareness({ ...awareness, body: v }),
                  awareness.targetArea,
                  (v) => setAwareness({ ...awareness, targetArea: v }),
                  awareness.mediaUrl,
                  (v) => setAwareness({ ...awareness, mediaUrl: v }),
                )}
                <button
                  type="submit"
                  disabled={awarenessMut.isPending}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primaryDark disabled:opacity-60"
                >
                  <Send size={15} /> Publish campaign
                </button>
              </form>
            )}

            {tab === 'programs' && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  programMut.mutate({
                    disaster_type: program.disasterType,
                    title: program.title,
                    body: program.body,
                    target_area: program.targetArea || undefined,
                    media_url: program.mediaUrl || undefined,
                  });
                }}
                className="space-y-3"
              >
                <div className="flex items-center gap-2">
                  <BookOpenCheck size={15} className="text-primary" />
                  <div>
                    <div className="text-sm font-bold text-text">Preparedness Program</div>
                    <div className="text-[11px] text-muted">
                      Before / During / After guidelines. Broadcasts <code>content.published</code> to citizens.
                    </div>
                  </div>
                </div>
                {contentFormInputs(
                  program.disasterType,
                  (v) => setProgram({ ...program, disasterType: v }),
                  program.title,
                  (v) => setProgram({ ...program, title: v }),
                  program.body,
                  (v) => setProgram({ ...program, body: v }),
                  program.targetArea,
                  (v) => setProgram({ ...program, targetArea: v }),
                  program.mediaUrl,
                  (v) => setProgram({ ...program, mediaUrl: v }),
                )}
                <button
                  type="submit"
                  disabled={programMut.isPending}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primaryDark disabled:opacity-60"
                >
                  <Send size={15} /> Publish & invite region
                </button>
              </form>
            )}

            {tab === 'alerts' && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  alertMut.mutate({
                    title: alert.title,
                    message: alert.message,
                    severity: alert.severity,
                    target_area: alert.targetArea || undefined,
                  });
                }}
                className="space-y-3"
              >
                <div className="flex items-center gap-2">
                  <Megaphone size={15} className="text-primary" />
                  <div>
                    <div className="text-sm font-bold text-text">Regional Alert Broadcast</div>
                    <div className="text-[11px] text-muted">
                      Sends an <code>alert.broadcast</code> push to citizen apps in the target region.
                    </div>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-text">Severity</label>
                    <select
                      value={alert.severity}
                      onChange={(e) => setAlert({ ...alert, severity: e.target.value as AlertSeverity })}
                      className="w-full rounded-lg border border-border bg-bg px-2.5 py-2 text-sm outline-none focus:border-primary"
                    >
                      <option value="HIGH">HIGH</option>
                      <option value="MEDIUM">MEDIUM</option>
                      <option value="LOW">LOW</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-text">Target area</label>
                    <select
                      value={alert.targetArea}
                      onChange={(e) => setAlert({ ...alert, targetArea: e.target.value })}
                      className="w-full rounded-lg border border-border bg-bg px-2.5 py-2 text-sm outline-none focus:border-primary"
                    >
                      <option value="">All districts</option>
                      {REGIONAL_AREAS.map((a) => (
                        <option key={a} value={a}>
                          {a}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-text">Alert title</label>
                  <input
                    value={alert.title}
                    onChange={(e) => setAlert({ ...alert, title: e.target.value })}
                    required
                    placeholder="e.g. Flash flood warning — avoid low-lying roads"
                    className="w-full rounded-lg border border-border bg-bg px-2.5 py-2 text-sm outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-text">Message</label>
                  <textarea
                    value={alert.message}
                    onChange={(e) => setAlert({ ...alert, message: e.target.value })}
                    required
                    rows={4}
                    placeholder="Actionable instructions for citizens…"
                    className="w-full rounded-lg border border-border bg-bg px-2.5 py-2 text-sm outline-none focus:border-primary"
                  />
                </div>
                <button
                  type="submit"
                  disabled={alertMut.isPending}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-danger py-2.5 text-sm font-semibold text-white transition-colors hover:brightness-95 disabled:opacity-60"
                >
                  <Send size={15} /> Broadcast alert
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Published content lists */}
      <div className="space-y-4">
        {contentQuery.isLoading && <LoadingBlock label="Loading published content…" />}

        {tab === 'awareness' && (
          <ContentList
            items={awarenessList}
            empty="No awareness campaigns published yet."
            queryError={contentQuery.isError}
          />
        )}

        {tab === 'programs' && (
          <ContentList
            items={programList}
            empty="No preparedness programs published yet."
            queryError={contentQuery.isError}
          />
        )}

        {tab === 'alerts' && (
          <div className="space-y-3">
            {alertsQuery.isLoading && <LoadingBlock label="Loading broadcasts…" />}
            {alerts.length === 0 && !alertsQuery.isLoading && (
              <div className="rounded-xl border border-border bg-surface shadow-card">
                <EmptyState icon={<Megaphone size={36} />} title="No broadcasts yet" hint="Regional alerts you push appear here." />
              </div>
            )}
            {alerts.map((a) => (
              <div key={a.alert_id} className="rounded-xl border border-border bg-surface p-4 shadow-card">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={clsx('rounded-full px-2 py-0.5 text-[11px] font-bold', severityStyles[a.severity])}>
                    {a.severity}
                  </span>
                  <span className="text-sm font-bold text-text">{a.title}</span>
                  <span className="ml-auto text-[11px] text-muted">{formatDateTime(a.created_at)}</span>
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{a.message}</p>
                <div className="mt-2 flex items-center gap-1.5 text-[11px] text-muted">
                  <AlertTriangle size={12} />
                  Region: {a.target_area ?? 'All districts'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ContentList({
  items,
  empty,
  queryError,
}: {
  items: Array<{ content_id: string; disaster_type: string; title: string; body: string; target_area: string | null; is_program: boolean; created_at: string }>;
  empty: string;
  queryError: boolean;
}) {
  if (queryError) {
    return (
      <div className="rounded-xl border border-border bg-surface p-6 text-center text-sm text-danger">
        Failed to load content. Check backend connectivity.
      </div>
    );
  }
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface shadow-card">
        <EmptyState icon={<Newspaper size={36} />} title={empty} />
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {items.map((c) => (
        <div key={c.content_id} className="rounded-xl border border-border bg-surface p-4 shadow-card">
          <div className="flex flex-wrap items-center gap-2">
            <EmergencyTypeTag type={c.disaster_type} />
            {c.is_program && (
              <span className="rounded-full bg-successLight px-2 py-0.5 text-[11px] font-bold text-success">PROGRAM</span>
            )}
            <span className="ml-auto text-[11px] text-muted">{formatDateTime(c.created_at)}</span>
          </div>
          <h3 className="mt-2 text-sm font-bold text-text">{c.title}</h3>
          <p className="mt-1 line-clamp-3 text-sm leading-relaxed text-slate-600">{c.body}</p>
          <div className="mt-2 text-[11px] text-muted">Target: {c.target_area ?? 'All districts'}</div>
        </div>
      ))}
    </div>
  );
}
