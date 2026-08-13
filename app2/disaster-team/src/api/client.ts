import axios from 'axios'

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'https://resqnet-production.up.railway.app/api/v1'

export const api = axios.create({ baseURL: API_BASE_URL })

let authToken: string | null = null

export function setAuthToken(token: string | null) {
  authToken = token
}

api.interceptors.request.use(config => {
  if (authToken) {
    config.headers = config.headers || {}
    config.headers.Authorization = `Bearer ${authToken}`
  }
  return config
})

export type AssignmentStatus =
  | 'OFFERED' | 'ACCEPTED' | 'DECLINED' | 'ON_THE_WAY' | 'ARRIVED' | 'COMPLETED'

export interface AssignmentSOSInfo {
  sos_id: string
  emergency_type: string
  description: string
  people_affected: number
  lat: number
  lng: number
  priority: string
  status: string
  guest_name: string | null
  guest_phone: string | null
}

export interface AssignmentDetail {
  assignment_id: string
  sos_id: string
  team_id: string
  team_name: string | null
  status: AssignmentStatus
  distance_km: number | null
  assigned_at: string
  updated_at: string
  sos: AssignmentSOSInfo
}

export interface TeamProfile {
  team_id: string
  team_name: string
  specialization: string[]
  experience_level: string
  is_available: boolean
  current_lat: number | null
  current_lng: number | null
  badge_number: string
  contact_phone: string | null
  location_updated_at: string | null
}

export interface LoginResponse {
  access_token: string
  token_type: string
  role: 'AUTHORITY' | 'DISASTER_MGMT_TEAM' | 'REQUESTER'
  user_id: string
  name: string
  user: { user_id: string; name: string; phone: string; email: string | null; role: string } | null
}

export async function login(phone: string, password: string): Promise<LoginResponse> {
  const res = await api.post('/auth/login', { phone, password })
  return res.data
}

export async function getMyTeam(): Promise<TeamProfile> {
  const res = await api.get('/team/me')
  return res.data
}

export async function getMyAssignments(): Promise<AssignmentDetail[]> {
  const res = await api.get('/assignments/mine')
  return res.data
}

export async function getAssignment(id: string): Promise<AssignmentDetail> {
  const res = await api.get(`/assignments/${id}`)
  return res.data
}

export async function respondToAssignment(id: string, status: 'ACCEPTED' | 'DECLINED') {
  const res = await api.patch(`/assignments/${id}/respond`, { status })
  return res.data
}

export async function updateAssignmentStatus(
  id: string,
  status: Exclude<AssignmentStatus, 'OFFERED' | 'DECLINED'>,
) {
  const res = await api.patch(`/assignments/${id}/status`, { status })
  return res.data
}

export async function updateAvailability(body: { is_available: boolean; current_lat?: number; current_lng?: number }) {
  const res = await api.patch('/team/availability', body)
  return res.data
}

export async function updateLocation(body: { lat: number; lng: number }) {
  const res = await api.patch('/team/location', body)
  return res.data
}

export async function getRouteForSOS(sosId: string, fromLat?: number, fromLng?: number) {
  const params: Record<string, number> = {}
  if (fromLat != null) params.from_lat = fromLat
  if (fromLng != null) params.from_lng = fromLng
  const res = await api.get(`/sos/${sosId}/route`, { params })
  return res.data
}

export default api
