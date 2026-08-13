import os
from dataclasses import dataclass, field
from pathlib import Path


@dataclass(frozen=True)
class Settings:
    APP_NAME: str = "Disaster Management System API"
    API_V1_PREFIX: str = "/api/v1"
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # Full connection string takes priority (e.g. Supabase/Neon pooled URL).
    # Example: postgresql+asyncpg://user:pass@host:6543/db?ssl=require
    DATABASE_URL_OVERRIDE: str | None = os.getenv("DATABASE_URL") or None

    DB_HOST: str = os.getenv("DB_HOST", "localhost")
    DB_PORT: int = int(os.getenv("DB_PORT", "5432"))
    DB_NAME: str = os.getenv("DB_NAME", "disaster_db")
    DB_USER: str = os.getenv("DB_USER", "postgres")
    DB_PASSWORD: str = os.getenv("DB_PASSWORD", "postgres")
    DB_SSL: bool = os.getenv("DB_SSL", "false").lower() in ("1", "true", "yes", "on")

    JWT_SECRET: str = os.getenv(
        "JWT_SECRET", "CHANGE_ME_super_secret_jwt_key_for_production"
    )
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRY_MINUTES: int = int(os.getenv("JWT_EXPIRY_MINUTES", "1440"))

    OSRM_URL: str = os.getenv(
        "OSRM_URL", "https://router.project-osrm.org/route/v1/driving"
    )
    ROUTE_TIMEOUT_SECONDS: int = int(os.getenv("ROUTE_TIMEOUT_SECONDS", "3"))
    EMERGENCY_AVG_SPEED_KMPH: float = float(os.getenv("EMERGENCY_AVG_SPEED_KMPH", "30"))

    CORS_ORIGINS: list[str] = field(
        default_factory=lambda: os.getenv(
            "CORS_ORIGINS",
            "http://localhost:5173,http://localhost:5174,http://localhost:5175,"
            "https://localhost,http://localhost,capacitor://localhost,ionic://localhost,"
            "http://localhost:8080,https://resqnet-henna.vercel.app",
        ).split(",")
    )

    @property
    def DATABASE_URL(self) -> str:
        if self.DATABASE_URL_OVERRIDE:
            url = self.DATABASE_URL_OVERRIDE
            if url.startswith("postgresql://") or url.startswith("postgres://"):
                url = url.replace("://", "+asyncpg://", 1) if "+asyncpg" not in url else url
            return url
        ssl = "?ssl=require" if self.DB_SSL else ""
        return (
            f"postgresql+asyncpg://{self.DB_USER}:{self.DB_PASSWORD}"
            f"@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}{ssl}"
        )

    @property
    def SYNC_DATABASE_URL(self) -> str:
        return (
            f"postgresql+psycopg2://{self.DB_USER}:{self.DB_PASSWORD}"
            f"@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
        )

    BASE_DIR: Path = field(default_factory=lambda: Path(__file__).resolve().parent.parent)


settings = Settings()
