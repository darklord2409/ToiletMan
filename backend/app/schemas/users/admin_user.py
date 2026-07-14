import uuid
from datetime import datetime

from pydantic import BaseModel

from app.schemas.base import TimestampedReadSchema


class AdminUserBase(BaseModel):
    role_id: uuid.UUID | None = None
    username: str
    email: str
    full_name: str | None = None
    is_active: bool = True
    is_superuser: bool = False
    language: str = "ru"


class AdminUserCreate(AdminUserBase):
    password: str


class AdminUserUpdate(BaseModel):
    role_id: uuid.UUID | None = None
    email: str | None = None
    full_name: str | None = None
    is_active: bool | None = None
    is_superuser: bool | None = None
    password: str | None = None
    language: str | None = None


class AdminUserRead(AdminUserBase, TimestampedReadSchema):
    last_login_at: datetime | None = None
