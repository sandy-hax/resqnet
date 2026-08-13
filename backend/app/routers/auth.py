from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from passlib.hash import bcrypt
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import AnyAuthUser
from app.auth.jwt import create_access_token
from app.database import get_db
from app.models.team import DisasterMgmtTeam
from app.models.user import User, UserRole
from app.schemas.auth import (
    LoginRequest,
    LoginResponse,
    RegisterRequest,
    RegisterResponse,
    UserPublic,
)
from app.schemas.team import TeamOut

router = APIRouter(prefix="/auth", tags=["auth"])


def _generate_badge_number(db: AsyncSession) -> str:
    from sqlalchemy import func

    count = db.scalar(select(func.count()).select_from(DisasterMgmtTeam))
    return f"NDRF-{count + 1:04d}"


@router.post(
    "/register",
    response_model=RegisterResponse,
    status_code=status.HTTP_201_CREATED,
)
async def register(payload: RegisterRequest, db: Annotated[AsyncSession, Depends(get_db)]) -> RegisterResponse:
    password_hash = bcrypt.hash(payload.password)
    user = User(
        name=payload.name,
        phone=payload.phone,
        email=payload.email,
        password_hash=password_hash,
        role=payload.role,
    )
    db.add(user)
    await db.flush()

    if payload.role == UserRole.DISASTER_MGMT_TEAM:
        if not payload.badge_number:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="badge_number is required for DISASTER_MGMT_TEAM registration",
            )
        team = DisasterMgmtTeam(
            user_id=user.user_id,
            team_name=payload.team_name or payload.name,
            specialization=payload.specialization or ["SEARCH_RESCUE"],
            experience_level=payload.experience_level,
            badge_number=payload.badge_number,
            contact_phone=payload.phone,
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

    await db.refresh(user)
    return RegisterResponse(
        user_id=user.user_id,
        role=user.role,
        user=UserPublic.model_validate(user),
    )


@router.post("/login", response_model=LoginResponse)
async def login(payload: LoginRequest, db: Annotated[AsyncSession, Depends(get_db)]) -> LoginResponse:
    result = await db.execute(select(User).where(User.phone == payload.phone))
    user = result.scalar_one_or_none()
    if user is None or not bcrypt.verify(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid phone or password",
        )

    token = create_access_token(subject=str(user.user_id), role=user.role.value)
    return LoginResponse(
        access_token=token,
        role=user.role,
        user_id=user.user_id,
        name=user.name,
        user=UserPublic.model_validate(user),
    )


@router.get("/me", response_model=dict)
async def me(current: AnyAuthUser, db: Annotated[AsyncSession, Depends(get_db)]):
    team = None
    if current.role == UserRole.DISASTER_MGMT_TEAM:
        result = await db.execute(
            select(DisasterMgmtTeam).where(DisasterMgmtTeam.user_id == current.user_id)
        )
        team_obj = result.scalar_one_or_none()
        if team_obj:
            team = TeamOut.model_validate(team_obj).model_dump()
    return {"user_id": str(current.user_id), "name": current.name, "phone": current.phone, "role": current.role.value, "team": team}
