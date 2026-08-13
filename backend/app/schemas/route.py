from pydantic import BaseModel


class RouteOut(BaseModel):
    distance_km: float
    duration_min: float
    polyline: list[list[float]]
    steps: list[str]
    is_fallback: bool


class ShelterOut(BaseModel):
    shelter_id: str
    name: str
    address: str
    lat: float
    lng: float
    capacity: int
    occupied: int
    contact_phone: str
    status: str
    supplies: list[str]
    distance_km: float | None = None