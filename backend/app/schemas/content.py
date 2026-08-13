import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.alert import AlertSeverity


class ContentCreate(BaseModel):
    disaster_type: str
    title: str
    body: str
    media_url: str | None = None
    target_area: str | None = None
    is_program: bool = False


class ContentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    content_id: uuid.UUID
    disaster_type: str
    title: str
    body: str
    media_url: str | None
    target_area: str | None
    is_program: bool
    created_at: datetime


class AlertCreate(BaseModel):
    title: str
    message: str
    severity: AlertSeverity = AlertSeverity.HIGH
    target_area: str | None = None


class AlertOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    alert_id: uuid.UUID
    title: str
    message: str
    severity: AlertSeverity
    target_area: str | None
    created_at: datetime