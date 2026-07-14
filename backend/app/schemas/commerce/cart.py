import uuid

from pydantic import BaseModel

from app.models.enums import CartStatus
from app.schemas.base import TimestampedReadSchema


class CartBase(BaseModel):
    customer_id: uuid.UUID | None = None
    session_token: str | None = None
    status: CartStatus = CartStatus.ACTIVE


class CartCreate(CartBase):
    pass


class CartUpdate(BaseModel):
    status: CartStatus | None = None


class CartRead(CartBase, TimestampedReadSchema):
    pass
