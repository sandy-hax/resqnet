import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class DisasterMgmtTeam(Base):
    __tablename__ = "disaster_mgmt_teams"

    team_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.user_id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        index=True,
    )
    team_name: Mapped[str] = mapped_column(String(255), nullable=False)
    specialization: Mapped[list[str]] = mapped_column(
        ARRAY(String(50)), nullable=False, default=list
    )
    experience_level: Mapped[str] = mapped_column(
        String(50), nullable=False, default="ADVANCED"
    )
    is_available: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    current_lat: Mapped[float | None] = mapped_column(Float, nullable=True)
    current_lng: Mapped[float | None] = mapped_column(Float, nullable=True)
    badge_number: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    contact_phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    location_updated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    user: Mapped["User"] = relationship(back_populates="team")  # noqa: F821
    assignments: Mapped[list["Assignment"]] = relationship(  # noqa: F821
        back_populates="team", cascade="all, delete-orphan"
    )
