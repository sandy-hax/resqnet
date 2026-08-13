import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.sos import SOSPriority, SOSStatus


class SOSCreate(BaseModel):
    emergency_type: str = Field(min_length=1, max_length=50)
    description: str = Field(min_length=1)
    people_affected: int = Field(default=1, ge=1)
    lat: float
    lng: float
    image_url: str | None = None
    guest_name: str | None = Field(default=None, max_length=255)
    guest_phone: str | None = Field(default=None, max_length=50)


class SOSVerify(BaseModel):
    verified: bool
    priority: SOSPriority = SOSPriority.MEDIUM


class SOSAssign(BaseModel):
    team_id: uuid.UUID


class SOSOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    sos_id: str
    requester_user_id: uuid.UUID | None
    guest_name: str | None
    guest_phone: str | None
    emergency_type: str
    description: str
    people_affected: int
    lat: float
    lng: float
    priority: SOSPriority
    status: SOSStatus
    image_url: str | None
    created_at: datetime
    updated_at: datetime


class AssignedTeamSummary(BaseModel):
    team_name: str
    team_type: str
    contact_phone: str | None
    eta_minutes: int | None
    responder_lat: float | None
    responder_lng: float | None


class DeclinedAssignmentSummary(BaseModel):
    team_name: str
    declined_at: datetime


class SOSDetail(SOSOut):
    assigned_team: AssignedTeamSummary | None = None
    declined_team: DeclinedAssignmentSummary | None = None