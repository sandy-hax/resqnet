from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import AuthorityUser
from app.database import get_db
from app.models.content import AwarenessContent
from app.models.user import User
from app.schemas.content import ContentCreate, ContentOut
from app.services.notification import broadcast_regional_program

router = APIRouter(prefix="/content", tags=["content"])


@router.get("", response_model=list[ContentOut])
async def list_content(
    db: Annotated[AsyncSession, Depends(get_db)],
    is_program: bool | None = None,
) -> list[ContentOut]:
    query = select(AwarenessContent).order_by(AwarenessContent.created_at.desc())
    if is_program is not None:
        query = query.where(AwarenessContent.is_program.is_(is_program))
    result = await db.execute(query)
    return [ContentOut.model_validate(c) for c in result.scalars().all()]


@router.post("/awareness", response_model=ContentOut, status_code=status.HTTP_201_CREATED)
async def publish_awareness(
    payload: ContentCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    _authority: AuthorityUser,
) -> ContentOut:
    data = payload.model_dump()
    data["is_program"] = False
    content = AwarenessContent(**data)
    db.add(content)
    await db.commit()
    await db.refresh(content)
    return ContentOut.model_validate(content)


@router.post("/preparedness", response_model=ContentOut, status_code=status.HTTP_201_CREATED)
async def publish_preparedness(
    payload: ContentCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    _authority: AuthorityUser,
) -> ContentOut:
    data = payload.model_dump()
    data["is_program"] = True
    content = AwarenessContent(**data)
    db.add(content)
    await db.commit()
    await db.refresh(content)

    await broadcast_regional_program(
        {
            "content_id": str(content.content_id),
            "title": content.title,
            "body": content.body,
            "media_url": content.media_url,
            "is_program": True,
        },
        target_area=content.target_area or "Your district",
    )
    return ContentOut.model_validate(content)
