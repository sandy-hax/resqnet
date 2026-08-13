from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import AnyAuthUser, AuthorityUser, OptionalUser
from app.database import get_db
from app.models.assignment import Assignment, AssignmentStatus
from app.models.sos import SOSPriority, SOSRequest, SOSStatus
from app.models.team import DisasterMgmtTeam
from app.models.user import User, UserRole
from app.schemas.route import RouteOut
from app.schemas.sos import (
    AssignedTeamSummary,
    DeclinedAssignmentSummary,
    SOSAssign,
    SOSCreate,
    SOSDetail,
    SOSOut,
    SOSVerify,
)
from app.services.ranking import calculate_haversine
from app.services.routing import get_navigation_route
from app.websocket.manager import ws_manager

router = APIRouter(prefix="/sos", tags=["sos"])


async def _next_sos_id(db: AsyncSession) -> str:
    count = await db.scalar(select(func.count()).select_from(SOSRequest))
    return f"SOS-{int(count or 0) + 1:06d}"


async def _active_assignment(db: AsyncSession, sos_id: str) -> Assignment | None:
    result = await db.execute(
        select(Assignment)
        .where(
            Assignment.sos_id == sos_id,
            Assignment.status.notin_([AssignmentStatus.DECLINED]),
        )
        .order_by(Assignment.assigned_at.desc())
    )
    return result.scalars().first()


async def _build_detail(db: AsyncSession, sos: SOSRequest) -> SOSDetail:
    detail = SOSDetail.model_validate(sos).model_dump()
    assignment = await _active_assignment(db, sos.sos_id)
    assigned_team = None
    if assignment is not None:
        team_result = await db.execute(
            select(DisasterMgmtTeam).where(DisasterMgmtTeam.team_id == assignment.team_id)
        )
        team = team_result.scalar_one_or_none()
        if team:
            distance_km = assignment.distance_km
            eta_minutes = None
            if distance_km is not None:
                eta_minutes = round((distance_km / 30.0) * 60.0)
            assigned_team = AssignedTeamSummary(
                team_name=team.team_name,
                team_type=" / ".join(team.specialization),
                contact_phone=team.contact_phone,
                eta_minutes=eta_minutes,
                responder_lat=team.current_lat,
                responder_lng=team.current_lng,
            )
    detail["assigned_team"] = assigned_team

    declined_team = None
    declined_result = await db.execute(
        select(Assignment)
        .where(
            Assignment.sos_id == sos.sos_id,
            Assignment.status == AssignmentStatus.DECLINED,
        )
        .order_by(Assignment.updated_at.desc())
    )
    declined_assignment = declined_result.scalars().first()
    if declined_assignment is not None:
        decl_team_result = await db.execute(
            select(DisasterMgmtTeam).where(DisasterMgmtTeam.team_id == declined_assignment.team_id)
        )
        decl_team = decl_team_result.scalar_one_or_none()
        if decl_team:
            declined_team = DeclinedAssignmentSummary(
                team_name=decl_team.team_name,
                declined_at=declined_assignment.updated_at,
            )
    detail["declined_team"] = declined_team
    return SOSDetail(**detail)


@router.post("", response_model=SOSDetail, status_code=status.HTTP_201_CREATED)
async def create_sos(
    payload: SOSCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current: OptionalUser,
) -> SOSDetail:
    sos_id = await _next_sos_id(db)
    requester_user_id = None
    guest_name = payload.guest_name
    guest_phone = payload.guest_phone

    if current is not None and current.role == UserRole.REQUESTER:
        requester_user_id = current.user_id
        guest_name = guest_name or current.name
        guest_phone = guest_phone or current.phone

    sos = SOSRequest(
        sos_id=sos_id,
        requester_user_id=requester_user_id,
        guest_name=guest_name,
        guest_phone=guest_phone,
        emergency_type=payload.emergency_type,
        description=payload.description,
        people_affected=payload.people_affected,
        lat=payload.lat,
        lng=payload.lng,
        image_url=payload.image_url,
        priority=SOSPriority.MEDIUM,
        status=SOSStatus.SUBMITTED,
    )
    db.add(sos)
    await db.commit()
    await db.refresh(sos)

    await ws_manager.broadcast_event(
        "sos.created",
        {
            "sos_id": sos.sos_id,
            "emergency_type": sos.emergency_type,
            "description": sos.description,
            "lat": sos.lat,
            "lng": sos.lng,
            "status": sos.status.value,
        },
        roles=[UserRole.AUTHORITY.value],
    )

    return await _build_detail(db, sos)


@router.get("/my", response_model=list[SOSDetail])
async def my_sos(
    db: Annotated[AsyncSession, Depends(get_db)],
    current: AnyAuthUser,
) -> list[SOSDetail]:
    result = await db.execute(
        select(SOSRequest)
        .where(SOSRequest.requester_user_id == current.user_id)
        .order_by(SOSRequest.created_at.desc())
    )
    return [await _build_detail(db, sos) for sos in result.scalars().all()]


@router.get("", response_model=list[SOSDetail])
async def list_sos(
    db: Annotated[AsyncSession, Depends(get_db)],
    _authority: AuthorityUser,
    status_filter: SOSStatus | None = Query(default=None, alias="status"),
    priority: SOSPriority | None = Query(default=None),
) -> list[SOSDetail]:
    query = select(SOSRequest).order_by(SOSRequest.created_at.desc())
    if status_filter is not None:
        query = query.where(SOSRequest.status == status_filter)
    if priority is not None:
        query = query.where(SOSRequest.priority == priority)
    result = await db.execute(query)
    return [await _build_detail(db, sos) for sos in result.scalars().all()]


@router.get("/{sos_id}", response_model=SOSDetail)
async def get_sos(
    sos_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> SOSDetail:
    sos = await db.get(SOSRequest, sos_id)
    if sos is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="SOS request not found")
    return await _build_detail(db, sos)


@router.patch("/{sos_id}/verify", response_model=SOSDetail)
async def verify_sos(
    sos_id: str,
    payload: SOSVerify,
    db: Annotated[AsyncSession, Depends(get_db)],
    _authority: AuthorityUser,
) -> SOSDetail:
    sos = await db.get(SOSRequest, sos_id)
    if sos is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="SOS request not found")
    if sos.status not in (SOSStatus.SUBMITTED, SOSStatus.VERIFIED):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"Cannot verify SOS in status {sos.status.value}")

    sos.priority = payload.priority
    sos.status = SOSStatus.VERIFIED if payload.verified else SOSStatus.REJECTED
    await db.commit()
    await db.refresh(sos)

    await ws_manager.broadcast_event("sos.status_changed", {"sos_id": sos.sos_id, "status": sos.status.value, "priority": sos.priority.value})
    return await _build_detail(db, sos)


@router.post("/{sos_id}/assign", response_model=SOSDetail, status_code=status.HTTP_201_CREATED)
async def assign_team(
    sos_id: str,
    payload: SOSAssign,
    db: Annotated[AsyncSession, Depends(get_db)],
    _authority: AuthorityUser,
) -> SOSDetail:
    sos = await db.get(SOSRequest, sos_id)
    if sos is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="SOS request not found")

    team = await db.get(DisasterMgmtTeam, payload.team_id)
    if team is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")

    existing = await _active_assignment(db, sos_id)
    if existing is not None and existing.status != AssignmentStatus.DECLINED:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="SOS already has an active assignment",
        )

    distance_km = None
    if team.current_lat is not None and team.current_lng is not None:
        distance_km = round(
            calculate_haversine(sos.lat, sos.lng, team.current_lat, team.current_lng), 2
        )

    assignment = Assignment(
        sos_id=sos_id, team_id=team.team_id, status=AssignmentStatus.OFFERED, distance_km=distance_km
    )
    db.add(assignment)
    sos.status = SOSStatus.ASSIGNED
    await db.commit()
    await db.refresh(assignment)
    await db.refresh(sos)

    await ws_manager.broadcast_event(
        "assignment.offered",
        {
            "assignment_id": str(assignment.assignment_id),
            "sos_id": sos.sos_id,
            "emergency_type": sos.emergency_type,
            "description": sos.description,
            "people_affected": sos.people_affected,
            "lat": sos.lat,
            "lng": sos.lng,
            "priority": sos.priority.value,
            "distance_km": distance_km,
            "status": assignment.status.value,
        },
        roles=[UserRole.DISASTER_MGMT_TEAM.value],
    )
    await ws_manager.broadcast_event("sos.status_changed", {"sos_id": sos.sos_id, "status": sos.status.value})

    return await _build_detail(db, sos)


@router.get("/{sos_id}/route", response_model=RouteOut)
async def get_route(
    sos_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    from_lat: float = Query(...),
    from_lng: float = Query(...),
) -> RouteOut:
    sos = await db.get(SOSRequest, sos_id)
    if sos is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="SOS request not found")
    route = await get_navigation_route(from_lat, from_lng, sos.lat, sos.lng)
    return RouteOut(**route)
