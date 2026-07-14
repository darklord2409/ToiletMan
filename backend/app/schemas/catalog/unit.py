from pydantic import BaseModel

from app.schemas.base import TimestampedReadSchema


class UnitBase(BaseModel):
    name: str
    symbol: str
    is_active: bool = True


class UnitCreate(UnitBase):
    pass


class UnitUpdate(BaseModel):
    name: str | None = None
    symbol: str | None = None
    is_active: bool | None = None


class UnitRead(UnitBase, TimestampedReadSchema):
    pass
