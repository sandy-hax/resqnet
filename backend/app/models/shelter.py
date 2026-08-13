import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, Float, Integer, String, func
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class ShelterStatus(str, enum.Enum):
    OPEN = "OPEN"
    FULL = "FULL"
    CLOSED = "CLOSED"


class ReliefShelter(Base):
    __tablename__ = "relief_shelters"

    shelter_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    address: Mapped[str] = mapped_column(String(255), nullable=False)
    lat: Mapped[float] = mapped_column(Float, nullable=False)
    lng: Mapped[float] = mapped_column(Float, nullable=False)
    capacity: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    occupied: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    contact_phone: Mapped[str] = mapped_column(String(50), nullable=False)
    status: Mapped[ShelterStatus] = mapped_column(
        Enum(ShelterStatus, name="shelter_status", values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        default=ShelterStatus.OPEN,
    )
    supplies: Mapped[list[str]] = mapped_column(
        ARRAY(String(100)), nullable=False, default=list
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )