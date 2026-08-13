from typing import Annotated
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from passlib.hash import bcrypt
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import AuthorityUser, TeamUser
from app.database import get_db
from app.models.team import DisasterMgmtTeam
from app.models.user import User, UserRole
from app.schemas.team import (
    RankedTeam,
    TeamAvailabilityRequest,
    TeamCreateRequest,
    TeamCreateResponse,
    TeamLocationRequest,
    TeamOut,
)
from app.services.ranking import get_ranked_teams
from app.websocket.manager import ws_manager

router = APIRouter(tags=["team"])


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


async def _broadcast_location(team: DisasterMgmtTeam) -> None:
    """Push the team's live position + availability to all connected authority dashboards."""
    await ws_manager.broadcast_event(
        "team.location_updated",
        data={
            "team_id": str(team.team_id),
            "team_name": team.team_name,
            "badge_number": team.badge_number,
            "is_available": team.is_available,
            "lat": team.current_lat,
            "lng": team.current_lng,
            "location_updated_at": (
                team.location_updated_at.isoformat() if team.location_updated_at else None
            ),
        },
        roles=[UserRole.AUTHORITY.value],
    )


@router.get("/team/me", response_model=TeamOut)
async def my_team(
    db: Annotated[AsyncSession, Depends(get_db)],
    current: TeamUser,
) -> TeamOut:
    team = await _get_team_for_user(db, current)
    return TeamOut.model_validate(team)


@router.patch("/team/availability", response_model=TeamOut)
async def update_availability(
    payload: TeamAvailabilityRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    current: TeamUser,
) -> TeamOut:
    team = await _get_team_for_user(db, current)
    team.is_available = payload.is_available
    if payload.current_lat is not None:
        team.current_lat = payload.current_lat
    if payload.current_lng is not None:
        team.current_lng = payload.current_lng
    if payload.current_lat is not None or payload.current_lng is not None:
        team.location_updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(team)
    await _broadcast_location(team)
    return TeamOut.model_validate(team)


@router.patch("/team/location", response_model=TeamOut)
async def update_location(
    payload: TeamLocationRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    current: TeamUser,
) -> TeamOut:
    team = await _get_team_for_user(db, current)
    team.current_lat = payload.lat
    team.current_lng = payload.lng
    team.location_updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(team)
    await _broadcast_location(team)
    return TeamOut.model_validate(team)


@router.get("/teams", response_model=list[TeamOut])
async def list_teams(
    db: Annotated[AsyncSession, Depends(get_db)],
    _authority: AuthorityUser,
) -> list[TeamOut]:
    result = await db.execute(select(DisasterMgmtTeam).order_by(DisasterMgmtTeam.team_name))
    return [TeamOut.model_validate(t) for t in result.scalars().all()]


@router.post("/teams", response_model=TeamCreateResponse, status_code=status.HTTP_201_CREATED)
async def create_team(
    payload: TeamCreateRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    _authority: AuthorityUser,
) -> TeamCreateResponse:
    """Register a new responder team (AUTHORITY only). Creates the login account and the team
    profile, then returns the credentials to hand to the team."""
    team_count = await db.scalar(select(func.count()).select_from(DisasterMgmtTeam))
    badge_number = f"NDRF-{int(team_count or 0) + 1:04d}"

    user = User(
        name=payload.team_name,
        phone=payload.phone,
        password_hash=bcrypt.hash(payload.password),
        role=UserRole.DISASTER_MGMT_TEAM,
    )
    db.add(user)
    try:
        await db.flush()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Phone number already registered",
        )

    team = DisasterMgmtTeam(
        user_id=user.user_id,
        team_name=payload.team_name,
        specialization=payload.specialization or ["SEARCH_RESCUE"],
        experience_level=payload.experience_level,
        badge_number=badge_number,
        contact_phone=payload.contact_phone,
        current_lat=payload.initial_lat,
        current_lng=payload.initial_lng,
    )
    db.add(team)

    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Phone number or badge number already registered",
        )

    await db.refresh(team)
    return TeamCreateResponse(
        team=TeamOut.model_validate(team),
        login_phone=payload.phone,
        badge_number=badge_number,
    )


@router.get("/teams/nearby", response_model=list[RankedTeam])
async def nearby_teams(
    db: Annotated[AsyncSession, Depends(get_db)],
    _authority: AuthorityUser,
    lat: float = Query(...),
    lng: float = Query(...),
    skill: str | None = Query(default=None),
) -> list[RankedTeam]:
    ranked = await get_ranked_teams(db, lat, lng, required_skill=skill)
    return [RankedTeam(**item) for item in ranked]
