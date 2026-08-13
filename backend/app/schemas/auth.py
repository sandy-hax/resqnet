import uuid

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.user import UserRole


class UserPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: uuid.UUID
    name: str
    phone: str
    email: str | None
    role: UserRole


class RegisterRequest(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    phone: str = Field(min_length=5, max_length=50)
    email: EmailStr | None = None
    password: str = Field(min_length=6, max_length=128)
    role: UserRole = UserRole.REQUESTER

    # Team profile (required when role == DISASTER_MGMT_TEAM)
    team_name: str | None = None
    specialization: list[str] = Field(default_factory=list)
    experience_level: str = "ADVANCED"
    badge_number: str | None = None


class RegisterResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: uuid.UUID
    role: UserRole
    user: UserPublic | None = None


class LoginRequest(BaseModel):
    phone: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: UserRole
    user_id: uuid.UUID
    name: str
    user: UserPublic | None = None


class TokenData(BaseModel):
    user_id: str | None = None