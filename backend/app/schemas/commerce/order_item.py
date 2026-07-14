import uuid
from decimal import Decimal

from pydantic import BaseModel

from app.schemas.base import TimestampedReadSchema


class OrderItemBase(BaseModel):
    order_id: uuid.UUID
    product_id: uuid.UUID | None = None
    product_name: str
    sku: str
    unit_price: Decimal
    quantity: int
    line_total: Decimal


class OrderItemCreate(OrderItemBase):
    pass


class OrderItemRead(OrderItemBase, TimestampedReadSchema):
    pass
