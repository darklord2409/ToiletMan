from datetime import datetime

from pydantic import BaseModel

from app.models.enums import PromotionType
from app.schemas.base import TimestampedReadSchema


class PromotionBase(BaseModel):
    name: str
    description: str | None = None
    promotion_type: PromotionType
    starts_at: datetime | None = None
    ends_at: datetime | None = None
    is_active: bool = True


class PromotionCreate(PromotionBase):
    pass


class PromotionUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    promotion_type: PromotionType | None = None
    starts_at: datetime | None = None
    ends_at: datetime | None = None
    is_active: bool | None = None


class PromotionRead(PromotionBase, TimestampedReadSchema):
    pass
