import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.assignment import AssignmentStatus


class TeamAvailabilityRequest(BaseModel):
    is_available: bool
    current_lat: float | None = None
    current_lng: float | None = None


class TeamLocationRequest(BaseModel):
    lat: float
    lng: float


class TeamRegisterExtra(BaseModel):
    team_name: str
    specialization: list[str] = Field(default_factory=list)
    experience_level: str = "ADVANCED"
    badge_number: str


class TeamCreateRequest(BaseModel):
    team_name: str = Field(min_length=1, max_length=255)
    phone: str = Field(min_length=3, max_length=50)
    password: str = Field(min_length=4, max_length=128)
    specialization: list[str] = Field(default_factory=list)
    experience_level: str = "ADVANCED"
    contact_phone: str | None = None
    initial_lat: float | None = None
    initial_lng: float | None = None


class TeamOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    team_id: uuid.UUID
    team_name: str
    specialization: list[str]
    experience_level: str
    is_available: bool
    current_lat: float | None
    current_lng: float | None
    badge_number: str
    contact_phone: str | None
    location_updated_at: datetime | None = None


class TeamCreateResponse(BaseModel):
    team: TeamOut
    login_phone: str
    badge_number: str


class RankedTeam(BaseModel):
    team_id: uuid.UUID
    team_name: str
    badge_number: str
    distance_km: float
    specialization: list[str]
    has_matching_skill: bool
    is_available: bool


class AssignmentUpdate(BaseModel):
    status: AssignmentStatus


class AssignmentRespond(BaseModel):
    status: AssignmentStatus  # ACCEPTED or DECLINED


class AssignmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    assignment_id: uuid.UUID
    sos_id: str
    team_id: uuid.UUID
    status: AssignmentStatus
    distance_km: float | None
    assigned_at: datetime
    updated_at: datetime


class AssignmentSOSInfo(BaseModel):
    sos_id: str
    emergency_type: str
    description: str
    people_affected: int
    lat: float
    lng: float
    priority: str
    status: str
    guest_name: str | None
    guest_phone: str | None


class AssignmentDetail(BaseModel):
    assignment_id: uuid.UUID
    sos_id: str
    team_id: uuid.UUID
    team_name: str | None = None
    status: AssignmentStatus
    distance_km: float | None
    assigned_at: datetime
    updated_at: datetime
    sos: AssignmentSOSInfo