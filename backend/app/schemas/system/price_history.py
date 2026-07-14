import uuid
from decimal import Decimal

from pydantic import BaseModel

from app.schemas.base import TimestampedReadSchema


class PriceHistoryBase(BaseModel):
    product_id: uuid.UUID
    changed_by_id: uuid.UUID | None = None
    old_price: Decimal
    new_price: Decimal
    reason: str | None = None


class PriceHistoryCreate(PriceHistoryBase):
    pass


class PriceHistoryRead(PriceHistoryBase, TimestampedReadSchema):
    pass
