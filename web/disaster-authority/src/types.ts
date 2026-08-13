export type Role = 'AUTHORITY' | 'DISASTER_MGMT_TEAM' | 'REQUESTER';

export type SOSPriority = 'LOW' | 'MEDIUM' | 'HIGH';

export type SOSStatus =
  | 'SUBMITTED'
  | 'VERIFIED'
  | 'ASSIGNED'
  | 'RESPONDER_ON_WAY'
  | 'ASSISTANCE_PROVIDED'
  | 'RESOLVED'
  | 'REJECTED';

export type AssignmentStatus =
  | 'OFFERED'
  | 'ACCEPTED'
  | 'DECLINED'
  | 'ON_THE_WAY'
  | 'ARRIVED'
  | 'COMPLETED';

export type AlertSeverity = 'LOW' | 'MEDIUM' | 'HIGH';

export interface UserPublic {
  user_id: string;
  name: string;
  phone: string;
  email: string | null;
  role: Role;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  role: Role;
  user_id: string;
  name: string;
  user: UserPublic | null;
}

export interface AssignedTeamSummary {
  team_name: string;
  team_type: string;
  contact_phone: string | null;
  eta_minutes: number | null;
  responder_lat: number | null;
  responder_lng: number | null;
}

export interface DeclinedAssignmentSummary {
  team_name: string;
  declined_at: string;
}

export interface SOSDetail {
  sos_id: string;
  requester_user_id: string | null;
  guest_name: string | null;
  guest_phone: string | null;
  emergency_type: string;
  description: string;
  people_affected: number;
  lat: number;
  lng: number;
  priority: SOSPriority;
  status: SOSStatus;
  image_url: string | null;
  created_at: string;
  updated_at: string;
  assigned_team: AssignedTeamSummary | null;
  declined_team: DeclinedAssignmentSummary | null;
}

export interface TeamOut {
  team_id: string;
  team_name: string;
  specialization: string[];
  experience_level: string;
  is_available: boolean;
  current_lat: number | null;
  current_lng: number | null;
  badge_number: string;
  contact_phone: string | null;
  location_updated_at: string | null;
}

export interface TeamLocationUpdate {
  team_id: string;
  team_name: string;
  badge_number: string;
  is_available: boolean;
  lat: number | null;
  lng: number | null;
  location_updated_at: string | null;
}

export interface RankedTeam {
  team_id: string;
  team_name: string;
  badge_number: string;
  distance_km: number;
  specialization: string[];
  has_matching_skill: boolean;
  is_available: boolean;
}

export interface TeamCreateResponse {
  team: TeamOut;
  login_phone: string;
  badge_number: string;
}

export interface ContentOut {
  content_id: string;
  disaster_type: string;
  title: string;
  body: string;
  media_url: string | null;
  target_area: string | null;
  is_program: boolean;
  created_at: string;
}

export interface AlertOut {
  alert_id: string;
  title: string;
  message: string;
  severity: AlertSeverity;
  target_area: string | null;
  created_at: string;
}

export interface ReliefShelter {
  shelter_id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  capacity: number;
  occupied: number;
  contact_phone: string;
  status: 'OPEN' | 'FULL' | 'CLOSED';
  supplies: string[];
}

export interface WsMessage<T = Record<string, unknown>> {
  event: string;
  data: T;
}

export interface SosCreatedEvent {
  sos_id: string;
  emergency_type: string;
  description?: string;
  lat: number;
  lng: number;
  status: string;
}

export interface SosStatusChangedEvent {
  sos_id: string;
  status: SOSStatus;
  priority?: SOSPriority;
  assignment_id?: string;
  assignment_status?: string;
}

export interface AssignmentRespondedEvent {
  assignment_id: string;
  sos_id: string;
  assignment_status: AssignmentStatus;
}
