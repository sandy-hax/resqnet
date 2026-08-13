from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.shelter import ReliefShelter
from app.schemas.route import ShelterOut
from app.services.ranking import calculate_haversine

router = APIRouter(prefix="/shelters", tags=["shelters"])


@router.get("", response_model=list[ShelterOut])
async def list_shelters(
    db: Annotated[AsyncSession, Depends(get_db)],
    lat: float | None = Query(default=None),
    lng: float | None = Query(default=None),
) -> list[ShelterOut]:
    result = await db.execute(select(ReliefShelter).order_by(ReliefShelter.name))
    shelters = result.scalars().all()

    items = []
    for shelter in shelters:
        item = {
            "shelter_id": str(shelter.shelter_id),
            "name": shelter.name,
            "address": shelter.address,
            "lat": shelter.lat,
            "lng": shelter.lng,
            "capacity": shelter.capacity,
            "occupied": shelter.occupied,
            "contact_phone": shelter.contact_phone,
            "status": shelter.status.value,
            "supplies": shelter.supplies,
            "distance_km": None,
        }
        if lat is not None and lng is not None:
            item["distance_km"] = round(
                calculate_haversine(lat, lng, shelter.lat, shelter.lng), 2
            )
        items.append(ShelterOut(**item))

    if lat is not None and lng is not None:
        items.sort(key=lambda s: s.distance_km or float("inf"))
    return items
