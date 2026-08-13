import type { AssignmentStatus, SOSPriority, SOSStatus } from '@/types';

export const EMERGENCY_TYPES = [
  'FLOOD',
  'CYCLONE',
  'EARTHQUAKE',
  'FIRE',
  'LANDSLIDE',
  'TSUNAMI',
  'MEDICAL',
  'OTHER',
] as const;

export const REGIONAL_AREAS = [
  'Low Lying Coastal & River Basin Zones',
  'District Flood Sector 4',
  'Coastal Belt (Within 25km of Coast)',
  'Seismic Zone IV & V',
  'Urban High-Rise Buildings',
  'Suburb North & West End',
  'Gandhi Circle & Main Road',
  'All Neighboring Districts',
] as const;

export function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function elapsedMinutes(fromIso: string, toIso?: string): number {
  const start = new Date(fromIso).getTime();
  const end = toIso ? new Date(toIso).getTime() : Date.now();
  return Math.max(0, Math.round((end - start) / 60000));
}

export const priorityColor: Record<SOSPriority, { dot: string; badge: string; text: string }> = {
  HIGH: { dot: 'bg-danger', badge: 'bg-dangerLight text-danger', text: 'text-danger' },
  MEDIUM: { dot: 'bg-warning', badge: 'bg-warningLight text-[#B26F00]', text: 'text-warning' },
  LOW: { dot: 'bg-slate-400', badge: 'bg-slate-100 text-slate-600', text: 'text-slate-500' },
};

export const statusStyles: Record<
  SOSStatus | AssignmentStatus,
  { badge: string; text: string; label: string }
> = {
  SUBMITTED: { badge: 'bg-slate-100 text-slate-600', text: 'text-slate-600', label: 'Submitted' },
  VERIFIED: { badge: 'bg-sky-100 text-sky-700', text: 'text-sky-700', label: 'Verified' },
  ASSIGNED: { badge: 'bg-violet-100 text-violet-700', text: 'text-violet-700', label: 'Assigned' },
  RESPONDER_ON_WAY: {
    badge: 'bg-amber-100 text-amber-700',
    text: 'text-amber-700',
    label: 'Responder On Way',
  },
  ASSISTANCE_PROVIDED: {
    badge: 'bg-teal-100 text-teal-700',
    text: 'text-teal-700',
    label: 'Assistance Provided',
  },
  RESOLVED: { badge: 'bg-successLight text-success', text: 'text-success', label: 'Resolved' },
  REJECTED: { badge: 'bg-dangerLight text-danger', text: 'text-danger', label: 'Rejected' },
  OFFERED: { badge: 'bg-violet-100 text-violet-700', text: 'text-violet-700', label: 'Offered' },
  ACCEPTED: { badge: 'bg-sky-100 text-sky-700', text: 'text-sky-700', label: 'Accepted' },
  DECLINED: { badge: 'bg-dangerLight text-danger', text: 'text-danger', label: 'Declined' },
  ON_THE_WAY: { badge: 'bg-amber-100 text-amber-700', text: 'text-amber-700', label: 'On The Way' },
  ARRIVED: { badge: 'bg-teal-100 text-teal-700', text: 'text-teal-700', label: 'Arrived' },
  COMPLETED: {
    badge: 'bg-successLight text-success',
    text: 'text-success',
    label: 'Completed',
  },
};

export function titleCase(value: string): string {
  return value
    .toLowerCase()
    .split('_')
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(' ');
}

export function truncate(text: string, max = 80): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}
