import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  CheckCircle2,
  Crosshair,
  FileImage,
  Loader2,
  MapPin,
  Phone,
  Radio,
  ShieldX,
  Users,
} from 'lucide-react';
import { MapContainer, Marker, TileLayer } from 'react-leaflet';
import L from 'leaflet';
import Modal from '@/components/Modal';
import { EmergencyTypeTag, PriorityBadge, StatusBadge } from '@/components/Badges';
import { assignSos, fetchNearbyTeams, fetchSosDetail, verifySos } from '@/lib/api';
import { sosQueryKey } from '@/hooks/useLiveSos';
import { formatDateTime } from '@/lib/format';
import { useToast } from '@/components/Toast';
import { Spinner } from '@/components/Feedback';
import type { RankedTeam, SOSDetail, SOSPriority } from '@/types';
import clsx from 'clsx';

function MiniMap({ lat, lng }: { lat: number; lng: number }) {
  const icon = useMemo(
    () =>
      L.divIcon({
        className: 'dms-marker',
        html: '<div style="position:relative;width:24px;height:24px;"><div style="position:absolute;inset:0;border-radius:9999px;background:#E14434;opacity:.35;animation:pulse 2s infinite;"></div><div style="position:absolute;inset:4px;border-radius:9999px;background:#E14434;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4);"></div></div>',
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      }),
    [],
  );
  return (
    <div className="h-40 overflow-hidden rounded-lg border border-border">
      <MapContainer center={[lat, lng]} zoom={15} className="h-full w-full" zoomControl={false}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[lat, lng]} icon={icon} />
      </MapContainer>
    </div>
  );
}

interface SosInspectionModalProps {
  sos: SOSDetail | null;
  onClose: () => void;
}

export default function SosInspectionModal({ sos, onClose }: SosInspectionModalProps) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [priority, setPriority] = useState<SOSPriority>(sos?.priority ?? 'MEDIUM');
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [showCandidates, setShowCandidates] = useState(false);
  const [skillFilter, setSkillFilter] = useState<string>(sos?.emergency_type ?? '');

  const detailQuery = useQuery({
    queryKey: ['sos-detail', sos?.sos_id],
    queryFn: () => fetchSosDetail(sos!.sos_id),
    enabled: Boolean(sos),
    initialData: sos ?? undefined,
    staleTime: 5_000,
  });

  const detail = detailQuery.data;
  const open = Boolean(sos);

  useEffect(() => {
    if (sos) {
      setPriority(sos.priority ?? 'MEDIUM');
      setSkillFilter(sos.emergency_type ?? '');
      setShowCandidates(false);
    }
  }, [sos?.sos_id, sos?.priority, sos?.emergency_type]);

  const nearbyQuery = useQuery({
    queryKey: ['teams-nearby', detail?.lat, detail?.lng, skillFilter],
    queryFn: () => fetchNearbyTeams(detail!.lat, detail!.lng, skillFilter),
    enabled: showCandidates && Boolean(detail),
  });

  const canVerify = detail && ['SUBMITTED', 'VERIFIED'].includes(detail.status);
  const canAssign = detail && detail.status === 'VERIFIED';

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: sosQueryKey });
    await queryClient.invalidateQueries({ queryKey: ['sos-detail', detail?.sos_id] });
  }

  async function handleVerify(verified: boolean) {
    if (!detail) return;
    setBusyAction(verified ? 'verify' : 'reject');
    try {
      await verifySos(detail.sos_id, verified, priority);
      toast.success(verified ? 'Emergency verified' : 'Emergency rejected', detail.sos_id);
      await refresh();
    } catch (err) {
      toast.error('Action failed', (err as Error).message);
    } finally {
      setBusyAction(null);
    }
  }

  async function handleAssign(team: RankedTeam) {
    if (!detail) return;
    setBusyAction(`assign-${team.team_id}`);
    try {
      await assignSos(detail.sos_id, team.team_id);
      toast.success('Team dispatched', `${team.team_name} offered assignment ${detail.sos_id}`);
      setShowCandidates(false);
      await refresh();
    } catch (err) {
      toast.error('Dispatch failed', (err as Error).message);
    } finally {
      setBusyAction(null);
    }
  }

  if (!detail) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={detail.sos_id}
      subtitle={`${detail.emergency_type} incident · received ${formatDateTime(detail.created_at)}`}
      wide
    >
      <div className="space-y-5">
        {/* Header meta */}
        <div className="flex flex-wrap items-center gap-2">
          <EmergencyTypeTag type={detail.emergency_type} />
          <PriorityBadge priority={detail.priority} />
          <StatusBadge status={detail.status} />
          <span className="text-xs text-muted">· {detail.people_affected} people affected</span>
        </div>

        {/* Requester + location */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-border bg-bg p-3">
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted">Requester</div>
            <div className="mt-1 text-sm font-semibold">{detail.guest_name ?? 'Anonymous caller'}</div>
            <div className="mt-0.5 flex items-center gap-1 text-xs text-muted">
              <Phone size={12} /> {detail.guest_phone ?? 'Guest SOS (no phone)'}
            </div>
            <div className="mt-2 flex items-center gap-1 text-xs text-muted">
              <MapPin size={12} />
              <code>
                {detail.lat.toFixed(5)}, {detail.lng.toFixed(5)}
              </code>
            </div>
          </div>
          <div className="rounded-lg border border-border bg-bg p-3">
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted">Hazard description</div>
            <p className="mt-1 text-sm leading-relaxed text-slate-700">{detail.description}</p>
          </div>
        </div>

        {/* Photo */}
        {detail.image_url && (
          <div>
            <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-muted">
              <FileImage size={13} /> Attached proof photo
            </div>
            <img
              src={detail.image_url}
              alt="Requester attached evidence"
              className="max-h-56 rounded-lg border border-border object-contain"
            />
          </div>
        )}

        {/* Precise location */}
        <div>
          <div className="mb-1.5 text-xs font-semibold text-muted">Precise location</div>
          <MiniMap lat={detail.lat} lng={detail.lng} />
        </div>

        {/* Assigned team */}
        {detail.assigned_team && (
          <div className="rounded-lg border border-success/30 bg-successLight p-3">
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-success">
              <Users size={13} /> Assigned response team
            </div>
            <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm font-semibold text-text">{detail.assigned_team.team_name}</div>
              <div className="text-xs text-muted">
                {detail.assigned_team.team_type}
                {detail.assigned_team.eta_minutes != null && ` · ETA ~${detail.assigned_team.eta_minutes} min`}
              </div>
            </div>
            {detail.declined_team && (
              <div className="mt-2 border-t border-success/20 pt-2 text-[11px] text-muted">
                Note: {detail.declined_team.team_name} previously declined before this reassignment.
              </div>
            )}
          </div>
        )}

        {/* Responder declined — awaiting reassignment */}
        {!detail.assigned_team && detail.declined_team && (
          <div className="rounded-lg border border-warning/40 bg-warningLight p-3">
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#B26F00]">
              <AlertTriangle size={13} /> Responder declined
            </div>
            <p className="mt-1 text-sm text-[#92400E]">
              <strong>{detail.declined_team.team_name}</strong> rejected this dispatch at{' '}
              {formatDateTime(detail.declined_team.declined_at)}. Please assign another team below.
            </p>
          </div>
        )}

        {/* Verification actions */}
        {canVerify && (
          <div className="rounded-lg border border-border bg-bg p-3">
            <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted">
              Legitimacy verification
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as SOSPriority)}
                className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs font-semibold outline-none focus:border-primary"
              >
                <option value="LOW">LOW</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HIGH">HIGH</option>
              </select>
              <button
                onClick={() => handleVerify(true)}
                disabled={busyAction !== null}
                className="flex items-center gap-1.5 rounded-lg bg-success px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:brightness-95 disabled:opacity-60"
              >
                {busyAction === 'verify' ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                Verify emergency
              </button>
              <button
                onClick={() => handleVerify(false)}
                disabled={busyAction !== null}
                className="flex items-center gap-1.5 rounded-lg bg-danger px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:brightness-95 disabled:opacity-60"
              >
                {busyAction === 'reject' ? <Loader2 size={13} className="animate-spin" /> : <ShieldX size={13} />}
                Reject as false alarm
              </button>
            </div>
          </div>
        )}

        {/* Candidate ranking & assignment */}
        {canAssign && (
          <div className="rounded-lg border border-border bg-bg p-3">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-muted">
                Ranked response teams — dispatch
              </div>
              {!showCandidates ? (
                <button
                  onClick={() => setShowCandidates(true)}
                  className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-primaryDark"
                >
                  <Radio size={13} /> Rank nearby teams
                </button>
              ) : (
                <select
                  value={skillFilter}
                  onChange={(e) => setSkillFilter(e.target.value)}
                  className="rounded-lg border border-border bg-surface px-2 py-1 text-xs font-semibold outline-none focus:border-primary"
                >
                  <option value={detail.emergency_type}>Match: {detail.emergency_type}</option>
                  <option value="">All specializations</option>
                </select>
              )}
            </div>

            {showCandidates && (
              <div className="mt-2 space-y-2">
                {nearbyQuery.isLoading && (
                  <div className="flex items-center gap-2 py-3 text-xs text-muted">
                    <Spinner size={14} /> Ranking teams by distance & readiness…
                  </div>
                )}
                {nearbyQuery.isError && (
                  <div className="rounded-md bg-dangerLight px-3 py-2 text-xs text-danger">
                    Could not rank teams. Check backend connectivity.
                  </div>
                )}
                {nearbyQuery.data?.map((team, idx) => (
                  <div
                    key={team.team_id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-surface px-3 py-2.5"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-[11px] font-bold text-slate-500">
                        {idx + 1}
                      </span>
                      <div>
                        <div className="text-sm font-semibold text-text">{team.team_name}</div>
                        <div className="flex items-center gap-2 text-[11px] text-muted">
                          <span>{team.badge_number}</span>
                          <span className="flex items-center gap-0.5">
                            <Crosshair size={11} /> {team.distance_km.toFixed(1)} km
                          </span>
                          {team.has_matching_skill && (
                            <span className="rounded bg-successLight px-1.5 py-0.5 font-semibold text-success">
                              Skill match
                            </span>
                          )}
                          {!team.is_available && (
                            <span className="rounded bg-warningLight px-1.5 py-0.5 font-semibold text-[#B26F00]">
                              Busy
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleAssign(team)}
                      disabled={busyAction !== null}
                      className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-primaryDark disabled:opacity-60"
                    >
                      {busyAction === `assign-${team.team_id}` ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <Radio size={13} />
                      )}
                      Dispatch
                    </button>
                  </div>
                ))}
                {nearbyQuery.data && nearbyQuery.data.length === 0 && (
                  <div className="py-2 text-xs text-muted">No available teams found nearby.</div>
                )}
              </div>
            )}
          </div>
        )}

        {/* In-progress assignment note */}
        {!canAssign && !canVerify && (
          <div className={clsx('rounded-lg border border-border bg-bg px-3 py-2 text-xs text-muted')}>
            This SOS is no longer awaiting verification. Further changes are driven by the assigned
            response team's live status updates.
          </div>
        )}
      </div>
    </Modal>
  );
}
