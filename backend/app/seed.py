from datetime import datetime, timezone

from passlib.hash import bcrypt
from sqlalchemy import func, select

from app.database import AsyncSessionLocal
from app.models import (
    AwarenessContent,
    ReliefShelter,
    ShelterStatus,
    DisasterMgmtTeam,
    User,
    UserRole,
)


async def seed_demo_data() -> None:
    """Idempotently seed demo accounts, awareness content and relief shelters."""
    async with AsyncSessionLocal() as db:
        user_count = await db.scalar(select(func.count()).select_from(User))
        if user_count:
            return

        authority = User(
            name="District Command Center",
            phone="+911234567890",
            email="authority@disaster.gov",
            password_hash=bcrypt.hash("authority123"),
            role=UserRole.AUTHORITY,
        )
        requester = User(
            name="Rahul Sharma",
            phone="+919876543210",
            email="rahul@example.com",
            password_hash=bcrypt.hash("citizen123"),
            role=UserRole.REQUESTER,
        )
        db.add_all([authority, requester])
        await db.flush()

        teams = [
            (
                User(
                    name="NDRF Rescue Unit 04",
                    phone="+919123456789",
                    email="ndrf04@disaster.gov",
                    password_hash=bcrypt.hash("team123"),
                    role=UserRole.DISASTER_MGMT_TEAM,
                ),
                DisasterMgmtTeam(
                    team_name="NDRF Rescue Unit 04",
                    specialization=["SEARCH_RESCUE", "FLOOD_RESCUE"],
                    experience_level="ADVANCED",
                    is_available=True,
                    current_lat=11.3445,
                    current_lng=77.7210,
                    badge_number="NDRF-0004",
                    contact_phone="+919123456789",
                    location_updated_at=datetime.now(timezone.utc),
                ),
            ),
            (
                User(
                    name="Fire & Rescue Squad 12",
                    phone="+919100000012",
                    email="fire12@disaster.gov",
                    password_hash=bcrypt.hash("team123"),
                    role=UserRole.DISASTER_MGMT_TEAM,
                ),
                DisasterMgmtTeam(
                    team_name="Fire & Rescue Squad 12",
                    specialization=["FIRE", "SEARCH_RESCUE"],
                    experience_level="ADVANCED",
                    is_available=True,
                    current_lat=11.3300,
                    current_lng=77.7100,
                    badge_number="FR-0012",
                    contact_phone="+919100000012",
                    location_updated_at=datetime.now(timezone.utc),
                ),
            ),
            (
                User(
                    name="Medical Rapid Response Team",
                    phone="+919100000013",
                    email="medical@disaster.gov",
                    password_hash=bcrypt.hash("team123"),
                    role=UserRole.DISASTER_MGMT_TEAM,
                ),
                DisasterMgmtTeam(
                    team_name="Medical Rapid Response Team",
                    specialization=["MEDICAL", "SEARCH_RESCUE"],
                    experience_level="INTERMEDIATE",
                    is_available=True,
                    current_lat=11.3520,
                    current_lng=77.7280,
                    badge_number="MRT-0007",
                    contact_phone="+919100000013",
                    location_updated_at=datetime.now(timezone.utc),
                ),
            ),
            (
                User(
                    name="Cyclone Shelter Evacuation Unit",
                    phone="+919100000014",
                    email="cyclone@disaster.gov",
                    password_hash=bcrypt.hash("team123"),
                    role=UserRole.DISASTER_MGMT_TEAM,
                ),
                DisasterMgmtTeam(
                    team_name="Cyclone Shelter Evacuation Unit",
                    specialization=["CYCLONE", "FLOOD_RESCUE"],
                    experience_level="ADVANCED",
                    is_available=True,
                    current_lat=11.3200,
                    current_lng=77.7400,
                    badge_number="CSU-0002",
                    contact_phone="+919100000014",
                    location_updated_at=datetime.now(timezone.utc),
                ),
            ),
        ]
        for user, team in teams:
            user.team = team
            db.add(user)

        content = [
            AwarenessContent(
                disaster_type="FLOOD",
                title="Urgent Flood Survival Protocol & High Ground Evacuation",
                body="If floodwaters rise inside your home: turn off electricity & main gas valves. "
                "Do not walk through moving water. Move immediately to high ground or rooftop. "
                "Signal rescue teams with bright clothes or torch light.",
                target_area="Low Lying Coastal & River Basin Zones",
                is_program=False,
            ),
            AwarenessContent(
                disaster_type="FLOOD",
                title="Community Flood Preparedness Initiative 2026",
                body="Official government program for distribution of emergency life jackets, "
                "water purification tablets, and solar lanterns in vulnerable sectors.",
                target_area="District Flood Sector 4",
                is_program=True,
            ),
            AwarenessContent(
                disaster_type="CYCLONE",
                title="Severe Cyclone Windstorm Emergency Guide",
                body="Secure loose outdoor items. Stay indoors away from windows and glass doors. "
                "Keep emergency power banks charged. Prepare food supplies for at least 72 hours.",
                target_area="Coastal Belt (Within 25km of Coast)",
                is_program=False,
            ),
            AwarenessContent(
                disaster_type="EARTHQUAKE",
                title="Drop, Cover, and Hold On Protocol",
                body="During intense shaking: DROP onto hands & knees. COVER head and neck under "
                "sturdy table. HOLD ON until shaking completely stops. Do NOT use elevators.",
                target_area="Seismic Zone IV & V",
                is_program=False,
            ),
            AwarenessContent(
                disaster_type="FIRE",
                title="Building Fire Safety & Smoke Inhalation Survival",
                body="Stay low under smoke layer. Check doors for heat before opening. Use "
                "stairwells instead of elevators. If clothes catch fire: Stop, Drop, and Roll.",
                target_area="Urban High-Rise Buildings",
                is_program=False,
            ),
        ]
        db.add_all(content)

        shelters = [
            ReliefShelter(
                name="Government Model Higher Secondary Relief Center",
                address="Near Gandhi Circle, Main Road",
                lat=11.3435,
                lng=77.7190,
                capacity=500,
                occupied=280,
                contact_phone="+919444411223",
                status=ShelterStatus.OPEN,
                supplies=["Food Packets", "Clean Water", "Medical First Aid", "Sleeping Mats", "Generator Power"],
            ),
            ReliefShelter(
                name="St. Joseph Community Disaster Shelter",
                address="Church Road, Suburb North",
                lat=11.3520,
                lng=77.7280,
                capacity=350,
                occupied=120,
                contact_phone="+919444433445",
                status=ShelterStatus.OPEN,
                supplies=["Hot Meals", "Potable Water", "Doctor on Duty", "Blankets", "Infant Care Supplies"],
            ),
            ReliefShelter(
                name="City Indoor Stadium Evacuation Hub",
                address="Sports Complex Road, West End",
                lat=11.3350,
                lng=77.7050,
                capacity=1000,
                occupied=980,
                contact_phone="+919444455667",
                status=ShelterStatus.FULL,
                supplies=["Emergency Rations", "Water Tanker", "Paramedic Unit", "Camp Beds"],
            ),
        ]
        db.add_all(shelters)

        await db.commit()
