import uuid
from decimal import Decimal

from pydantic import BaseModel

from app.schemas.base import TimestampedReadSchema


class CartItemBase(BaseModel):
    cart_id: uuid.UUID
    product_id: uuid.UUID
    quantity: int = 1
    unit_price: Decimal


class CartItemCreate(CartItemBase):
    pass


class CartItemUpdate(BaseModel):
    quantity: int | None = None
    unit_price: Decimal | None = None


class CartItemRead(CartItemBase, TimestampedReadSchema):
    pass
