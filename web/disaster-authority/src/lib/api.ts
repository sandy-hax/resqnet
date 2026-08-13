import axios from 'axios';
import type {
  AlertOut,
  AlertSeverity,
  ContentOut,
  LoginResponse,
  RankedTeam,
  ReliefShelter,
  SOSDetail,
  SOSPriority,
  TeamCreateResponse,
  TeamOut,
} from '@/types';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api/v1';

export const api = axios.create({ baseURL: API_BASE_URL });

let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

api.interceptors.request.use((config) => {
  if (authToken) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${authToken}`;
  }
  return config;
});

/* ------------------------------ Auth ------------------------------ */

export async function loginRequest(phone: string, password: string): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>('/auth/login', { phone, password });
  return data;
}

/* ------------------------------- SOS ------------------------------ */

export async function fetchSos(): Promise<SOSDetail[]> {
  const { data } = await api.get<SOSDetail[]>('/sos');
  return data;
}

export async function fetchSosDetail(sosId: string): Promise<SOSDetail> {
  const { data } = await api.get<SOSDetail>(`/sos/${sosId}`);
  return data;
}

export async function verifySos(
  sosId: string,
  verified: boolean,
  priority: SOSPriority,
): Promise<SOSDetail> {
  const { data } = await api.patch<SOSDetail>(`/sos/${sosId}/verify`, { verified, priority });
  return data;
}

export async function assignSos(sosId: string, teamId: string): Promise<SOSDetail> {
  const { data } = await api.post<SOSDetail>(`/sos/${sosId}/assign`, { team_id: teamId });
  return data;
}

/* ------------------------------ Teams ------------------------------ */

export async function fetchTeams(): Promise<TeamOut[]> {
  const { data } = await api.get<TeamOut[]>('/teams');
  return data;
}

export async function fetchNearbyTeams(
  lat: number,
  lng: number,
  skill?: string,
): Promise<RankedTeam[]> {
  const { data } = await api.get<RankedTeam[]>('/teams/nearby', {
    params: { lat, lng, skill },
  });
  return data;
}

export async function createTeam(payload: {
  team_name: string;
  phone: string;
  password: string;
  specialization?: string[];
  experience_level?: string;
  contact_phone?: string;
  initial_lat?: number;
  initial_lng?: number;
}): Promise<TeamCreateResponse> {
  const { data } = await api.post<TeamCreateResponse>('/teams', payload);
  return data;
}

/* ------------------------------ Content ---------------------------- */

export async function fetchContent(): Promise<ContentOut[]> {
  const { data } = await api.get<ContentOut[]>('/content');
  return data;
}

export async function publishAwareness(payload: {
  disaster_type: string;
  title: string;
  body: string;
  media_url?: string;
  target_area?: string;
}): Promise<ContentOut> {
  const { data } = await api.post<ContentOut>('/content/awareness', {
    ...payload,
    is_program: false,
  });
  return data;
}

export async function publishPreparedness(payload: {
  disaster_type: string;
  title: string;
  body: string;
  media_url?: string;
  target_area?: string;
}): Promise<ContentOut> {
  const { data } = await api.post<ContentOut>('/content/preparedness', {
    ...payload,
    is_program: true,
  });
  return data;
}

/* ------------------------------ Alerts ------------------------------ */

export async function fetchAlerts(): Promise<AlertOut[]> {
  const { data } = await api.get<AlertOut[]>('/alerts');
  return data;
}

export async function publishAlert(payload: {
  title: string;
  message: string;
  severity: AlertSeverity;
  target_area?: string;
}): Promise<AlertOut> {
  const { data } = await api.post<AlertOut>('/alerts', payload);
  return data;
}

/* ------------------------------ Shelters ---------------------------- */

export async function fetchShelters(): Promise<ReliefShelter[]> {
  const { data } = await api.get<ReliefShelter[]>('/shelters');
  return data;
}
