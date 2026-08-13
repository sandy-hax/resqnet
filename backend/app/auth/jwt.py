from datetime import datetime, timedelta, timezone
from typing import Any

import jwt

from app.config import settings

ALGORITHM = settings.JWT_ALGORITHM
SECRET_KEY = settings.JWT_SECRET


def create_access_token(
    subject: str, role: str, expires_delta: timedelta | None = None
) -> str:
    now = datetime.now(timezone.utc)
    expire = now + (
        expires_delta or timedelta(minutes=settings.JWT_EXPIRY_MINUTES)
    )
    payload: dict[str, Any] = {
        "sub": str(subject),
        "role": role,
        "iat": now,
        "exp": expire,
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> dict[str, Any]:
    return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])