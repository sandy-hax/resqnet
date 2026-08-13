import math
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.team import DisasterMgmtTeam


def calculate_haversine(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Great-circle distance between two coordinates in kilometers (R = 6371 km)."""
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


async def get_ranked_teams(
    db: AsyncSession,
    sos_lat: float,
    sos_lng: float,
    required_skill: str | None = None,
    limit: int = 5,
) -> list[dict]:
    """Return the top-N available teams ranked by specialization match and distance."""
    result = await db.execute(
        select(DisasterMgmtTeam).where(DisasterMgmtTeam.is_available.is_(True))
    )
    teams = result.scalars().all()

    ranked_list: list[dict] = []
    for team in teams:
        if team.current_lat is None or team.current_lng is None:
            continue

        dist = calculate_haversine(sos_lat, sos_lng, team.current_lat, team.current_lng)

        has_skill = (
            required_skill.upper() in [s.upper() for s in team.specialization]
            if required_skill
            else True
        )

        ranked_list.append(
            {
                "team_id": str(team.team_id),
                "team_name": team.team_name,
                "badge_number": team.badge_number,
                "distance_km": round(dist, 2),
                "specialization": team.specialization,
                "has_matching_skill": has_skill,
                "is_available": team.is_available,
            }
        )

    ranked_list.sort(key=lambda x: (not x["has_matching_skill"], x["distance_km"]))
    return ranked_list[:limit]
