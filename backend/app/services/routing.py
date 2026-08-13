import logging

import httpx

from app.config import settings
from app.services.ranking import calculate_haversine

logger = logging.getLogger("uvicorn.error")


async def get_navigation_route(
    from_lat: float, from_lng: float, to_lat: float, to_lng: float
) -> dict:
    """Fetch a turn-by-turn driving route from a public OSRM server.

    Falls back to a straight-line projection at the configured average
    emergency speed when OSRM is unreachable or returns an error.
    """
    osrm_url = (
        f"{settings.OSRM_URL}/{from_lng},{from_lat};{to_lng},{to_lat}"
        "?overview=full&geometries=geojson&steps=true"
    )

    try:
        async with httpx.AsyncClient(timeout=settings.ROUTE_TIMEOUT_SECONDS) as client:
            resp = await client.get(osrm_url)
            if resp.status_code == 200:
                data = resp.json()
                route = data["routes"][0]

                # Convert GeoJSON [lng, lat] to Leaflet-compatible [lat, lng]
                coordinates = [[pt[1], pt[0]] for pt in route["geometry"]["coordinates"]]
                steps = [
                    f"{step['maneuver']['type']} onto {step['name']}"
                    if step["name"]
                    else step["maneuver"]["type"]
                    for step in route["legs"][0]["steps"]
                ]

                return {
                    "distance_km": round(route["distance"] / 1000.0, 2),
                    "duration_min": round(route["duration"] / 60.0, 1),
                    "polyline": coordinates,
                    "steps": steps,
                    "is_fallback": False,
                }
    except Exception as exc:
        logger.warning("OSRM routing failed (%s), using straight-line fallback", exc)

    # Fallback straight-line logic
    dist = calculate_haversine(from_lat, from_lng, to_lat, to_lng)
    est_duration = (dist / settings.EMERGENCY_AVG_SPEED_KMPH) * 60.0

    return {
        "distance_km": round(dist, 2),
        "duration_min": round(est_duration, 1),
        "polyline": [[from_lat, from_lng], [to_lat, to_lng]],
        "steps": ["Proceed directly towards the emergency coordinates."],
        "is_fallback": True,
    }
