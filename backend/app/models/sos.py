import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class SOSPriority(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


class SOSStatus(str, enum.Enum):
    SUBMITTED = "SUBMITTED"
    VERIFIED = "VERIFIED"
    ASSIGNED = "ASSIGNED"
    RESPONDER_ON_WAY = "RESPONDER_ON_WAY"
    ASSISTANCE_PROVIDED = "ASSISTANCE_PROVIDED"
    RESOLVED = "RESOLVED"
    REJECTED = "REJECTED"


class SOSRequest(Base):
    __tablename__ = "sos_requests"

    sos_id: Mapped[str] = mapped_column(String(50), primary_key=True)
    requester_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.user_id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    guest_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    guest_phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    emergency_type: Mapped[str] = mapped_column(String(50), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    people_affected: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    lat: Mapped[float] = mapped_column(Float, nullable=False)
    lng: Mapped[float] = mapped_column(Float, nullable=False)
    priority: Mapped[SOSPriority] = mapped_column(
        Enum(SOSPriority, name="sos_priority", values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        default=SOSPriority.MEDIUM,
    )
    status: Mapped[SOSStatus] = mapped_column(
        Enum(SOSStatus, name="sos_status", values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        default=SOSStatus.SUBMITTED,
        index=True,
    )
    image_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    assignments: Mapped[list["Assignment"]] = relationship(  # noqa: F821
        back_populates="sos", cascade="all, delete-orphan"
    )
