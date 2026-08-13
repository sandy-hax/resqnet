from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import TeamUser
from app.database import get_db
from app.models.assignment import Assignment, AssignmentStatus
from app.models.sos import SOSRequest, SOSStatus
from app.models.team import DisasterMgmtTeam
from app.models.user import User, UserRole
from app.schemas.team import (
    AssignmentDetail,
    AssignmentRespond,
    AssignmentUpdate,
    AssignmentSOSInfo,
)
from app.websocket.manager import ws_manager

router = APIRouter(prefix="/assignments", tags=["assignments"])

_ALLOWED_TRANSITIONS: dict[AssignmentStatus, set[AssignmentStatus]] = {
    AssignmentStatus.OFFERED: {AssignmentStatus.ACCEPTED, AssignmentStatus.DECLINED},
    AssignmentStatus.ACCEPTED: {AssignmentStatus.ON_THE_WAY},
    AssignmentStatus.ON_THE_WAY: {AssignmentStatus.ARRIVED},
    AssignmentStatus.ARRIVED: {AssignmentStatus.COMPLETED},
}

_SOS_SYNC: dict[AssignmentStatus, SOSStatus | None] = {
    AssignmentStatus.ON_THE_WAY: SOSStatus.RESPONDER_ON_WAY,
    AssignmentStatus.ARRIVED: SOSStatus.ASSISTANCE_PROVIDED,
    AssignmentStatus.COMPLETED: SOSStatus.RESOLVED,
}


async def _get_team_for_user(db: AsyncSession, user: User) -> DisasterMgmtTeam:
    result = await db.execute(
        select(DisasterMgmtTeam).where(DisasterMgmtTeam.user_id == user.user_id)
    )
    team = result.scalar_one_or_none()
    if team is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No team profile linked to this account",
        )
    return team


async def _get_owned_assignment(db: AsyncSession, assignment_id, team: DisasterMgmtTeam) -> Assignment:
    assignment = await db.get(Assignment, assignment_id)
    if assignment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found")
    if assignment.team_id != team.team_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Assignment belongs to another team")
    return assignment


async def _build_detail(db: AsyncSession, assignment: Assignment, team_name: str | None = None) -> AssignmentDetail:
    sos = await db.get(SOSRequest, assignment.sos_id)
    if sos is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Linked SOS request not found")
    if team_name is None:
        team = await db.get(DisasterMgmtTeam, assignment.team_id)
        team_name = team.team_name if team else None
    sos_info = AssignmentSOSInfo(
        sos_id=sos.sos_id,
        emergency_type=sos.emergency_type,
        description=sos.description,
        people_affected=sos.people_affected,
        lat=sos.lat,
        lng=sos.lng,
        priority=sos.priority.value,
        status=sos.status.value,
        guest_name=sos.guest_name,
        guest_phone=sos.guest_phone,
    )
    return AssignmentDetail(
        assignment_id=assignment.assignment_id,
        sos_id=assignment.sos_id,
        team_id=assignment.team_id,
        team_name=team_name,
        status=assignment.status,
        distance_km=assignment.distance_km,
        assigned_at=assignment.assigned_at,
        updated_at=assignment.updated_at,
        sos=sos_info,
    )


@router.get("/mine", response_model=list[AssignmentDetail])
async def my_assignments(
    db: Annotated[AsyncSession, Depends(get_db)],
    current: TeamUser,
) -> list[AssignmentDetail]:
    team = await _get_team_for_user(db, current)
    result = await db.execute(
        select(Assignment)
        .where(Assignment.team_id == team.team_id)
        .order_by(Assignment.assigned_at.desc())
    )
    return [await _build_detail(db, a) for a in result.scalars().all()]


@router.get("/{assignment_id}", response_model=AssignmentDetail)
async def get_assignment(
    assignment_id,
    db: Annotated[AsyncSession, Depends(get_db)],
    current: TeamUser,
) -> AssignmentDetail:
    team = await _get_team_for_user(db, current)
    assignment = await _get_owned_assignment(db, assignment_id, team)
    return await _build_detail(db, assignment)


@router.patch("/{assignment_id}/respond", response_model=AssignmentDetail)
async def respond_to_offer(
    assignment_id,
    payload: AssignmentRespond,
    db: Annotated[AsyncSession, Depends(get_db)],
    current: TeamUser,
) -> AssignmentDetail:
    team = await _get_team_for_user(db, current)
    assignment = await _get_owned_assignment(db, assignment_id, team)
    if assignment.status != AssignmentStatus.OFFERED:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Assignment is not in OFFERED state")
    if payload.status not in (AssignmentStatus.ACCEPTED, AssignmentStatus.DECLINED):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Only ACCEPTED or DECLINED allowed")

    assignment.status = payload.status
    sos = await db.get(SOSRequest, assignment.sos_id)
    reverted = False

    if payload.status == AssignmentStatus.DECLINED:
        other_active = await db.scalar(
            select(func.count())
            .select_from(Assignment)
            .where(
                Assignment.sos_id == assignment.sos_id,
                Assignment.status != AssignmentStatus.DECLINED,
                Assignment.assignment_id != assignment.assignment_id,
            )
        )
        if (other_active or 0) == 0 and sos is not None and sos.status == SOSStatus.ASSIGNED:
            sos.status = SOSStatus.VERIFIED
            reverted = True

    await db.commit()
    await db.refresh(assignment)
    if sos is not None:
        await db.refresh(sos)
        await ws_manager.broadcast_event(
            "assignment.responded",
            {
                "assignment_id": str(assignment.assignment_id),
                "sos_id": assignment.sos_id,
                "assignment_status": assignment.status.value,
            },
            roles=[UserRole.AUTHORITY.value],
        )
        if reverted:
            await ws_manager.broadcast_event(
                "sos.status_changed",
                {
                    "sos_id": sos.sos_id,
                    "status": sos.status.value,
                    "assignment_id": str(assignment.assignment_id),
                    "assignment_status": assignment.status.value,
                },
            )
    return await _build_detail(db, assignment)


@router.patch("/{assignment_id}/status", response_model=AssignmentDetail)
async def update_assignment_status(
    assignment_id,
    payload: AssignmentUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current: TeamUser,
) -> AssignmentDetail:
    team = await _get_team_for_user(db, current)
    assignment = await _get_owned_assignment(db, assignment_id, team)
    new_status = payload.status

    if new_status == assignment.status:
        return await _build_detail(db, assignment)
    allowed = _ALLOWED_TRANSITIONS.get(assignment.status, set())
    if new_status not in allowed:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot transition from {assignment.status.value} to {new_status.value}",
        )

    assignment.status = new_status
    sos = await db.get(SOSRequest, assignment.sos_id)
    sos_status = _SOS_SYNC.get(new_status)
    if sos_status is not None and sos is not None:
        sos.status = sos_status

    await db.commit()
    await db.refresh(assignment)
    if sos is not None:
        await db.refresh(sos)

    await ws_manager.broadcast_event(
        "sos.status_changed",
        {
            "sos_id": assignment.sos_id,
            "status": sos.status.value if sos else None,
            "assignment_id": str(assignment.assignment_id),
            "assignment_status": assignment.status.value,
        },
    )

    return await _build_detail(db, assignment, team_name=team.team_name)
