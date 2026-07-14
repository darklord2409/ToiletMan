from pydantic import BaseModel

from app.schemas.base import TimestampedReadSchema


class CustomerBase(BaseModel):
    telegram_id: int | None = None
    telegram_username: str | None = None
    email: str | None = None
    phone: str | None = None
    first_name: str | None = None
    last_name: str | None = None
    is_active: bool = True
    language: str = "ru"
    notifications_enabled: bool = True


class CustomerCreate(CustomerBase):
    password: str | None = None


class CustomerUpdate(BaseModel):
    email: str | None = None
    phone: str | None = None
    first_name: str | None = None
    last_name: str | None = None
    is_active: bool | None = None
    password: str | None = None
    language: str | None = None
    notifications_enabled: bool | None = None


class CustomerRead(CustomerBase, TimestampedReadSchema):
    pass
