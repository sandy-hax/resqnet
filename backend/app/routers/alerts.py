from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import AuthorityUser
from app.database import get_db
from app.models.alert import Alert
from app.models.user import User
from app.schemas.content import AlertCreate, AlertOut
from app.services.notification import broadcast_alert

router = APIRouter(prefix="/alerts", tags=["alerts"])


@router.get("", response_model=list[AlertOut])
async def list_alerts(
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[AlertOut]:
    result = await db.execute(select(Alert).order_by(Alert.created_at.desc()))
    return [AlertOut.model_validate(a) for a in result.scalars().all()]


@router.post("", response_model=AlertOut, status_code=status.HTTP_201_CREATED)
async def publish_alert(
    payload: AlertCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    _authority: AuthorityUser,
) -> AlertOut:
    alert = Alert(**payload.model_dump())
    db.add(alert)
    await db.commit()
    await db.refresh(alert)

    await broadcast_alert(
        {
            "alert_id": str(alert.alert_id),
            "title": alert.title,
            "message": alert.message,
            "severity": alert.severity.value,
            "target_area": alert.target_area,
            "created_at": alert.created_at.isoformat() if alert.created_at else None,
        }
    )
    return AlertOut.model_validate(alert)
