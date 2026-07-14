import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel

from app.models.enums import AmountType
from app.schemas.base import TimestampedReadSchema


class CouponBase(BaseModel):
    promotion_id: uuid.UUID | None = None
    code: str
    amount_type: AmountType
    discount_value: Decimal
    min_order_amount: Decimal | None = None
    usage_limit: int | None = None
    usage_count: int = 0
    starts_at: datetime | None = None
    ends_at: datetime | None = None
    is_active: bool = True


class CouponCreate(CouponBase):
    pass


class CouponUpdate(BaseModel):
    promotion_id: uuid.UUID | None = None
    amount_type: AmountType | None = None
    discount_value: Decimal | None = None
    min_order_amount: Decimal | None = None
    usage_limit: int | None = None
    starts_at: datetime | None = None
    ends_at: datetime | None = None
    is_active: bool | None = None


class CouponRead(CouponBase, TimestampedReadSchema):
    pass
