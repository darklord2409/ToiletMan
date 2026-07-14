import uuid
from decimal import Decimal

from pydantic import BaseModel

from app.models.enums import AmountType, DiscountScope
from app.schemas.base import TimestampedReadSchema


class DiscountBase(BaseModel):
    promotion_id: uuid.UUID
    category_id: uuid.UUID | None = None
    product_id: uuid.UUID | None = None
    scope: DiscountScope
    amount_type: AmountType
    value: Decimal


class DiscountCreate(DiscountBase):
    pass


class DiscountUpdate(BaseModel):
    category_id: uuid.UUID | None = None
    product_id: uuid.UUID | None = None
    scope: DiscountScope | None = None
    amount_type: AmountType | None = None
    value: Decimal | None = None


class DiscountRead(DiscountBase, TimestampedReadSchema):
    pass
