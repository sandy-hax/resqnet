import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, Float, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class AssignmentStatus(str, enum.Enum):
    OFFERED = "OFFERED"
    ACCEPTED = "ACCEPTED"
    DECLINED = "DECLINED"
    ON_THE_WAY = "ON_THE_WAY"
    ARRIVED = "ARRIVED"
    COMPLETED = "COMPLETED"


class Assignment(Base):
    __tablename__ = "assignments"

    assignment_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    sos_id: Mapped[str] = mapped_column(
        String(50), ForeignKey("sos_requests.sos_id", ondelete="CASCADE"), nullable=False, index=True
    )
    team_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("disaster_mgmt_teams.team_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    status: Mapped[AssignmentStatus] = mapped_column(
        Enum(
            AssignmentStatus,
            name="assignment_status",
            values_callable=lambda x: [e.value for e in x],
        ),
        nullable=False,
        default=AssignmentStatus.OFFERED,
        index=True,
    )
    distance_km: Mapped[float | None] = mapped_column(Float, nullable=True)
    assigned_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    sos: Mapped["SOSRequest"] = relationship(back_populates="assignments")  # noqa: F821
    team: Mapped["DisasterMgmtTeam"] = relationship(back_populates="assignments")  # noqa: F821