import uuid
from decimal import Decimal
from typing import Any

from pydantic import BaseModel

from app.models.enums import DeliveryMethod, OrderStatus, PaymentMethod
from app.schemas.base import TimestampedReadSchema


class OrderBase(BaseModel):
    customer_id: uuid.UUID
    coupon_id: uuid.UUID | None = None
    order_number: str
    status: OrderStatus = OrderStatus.PENDING
    subtotal: Decimal = Decimal("0")
    discount_total: Decimal = Decimal("0")
    tax_total: Decimal = Decimal("0")
    shipping_total: Decimal = Decimal("0")
    grand_total: Decimal = Decimal("0")
    currency: str = "USD"
    shipping_address: dict[str, Any] | None = None
    billing_address: dict[str, Any] | None = None
    notes: str | None = None
    delivery_method: DeliveryMethod | None = None
    payment_method: PaymentMethod | None = None
    contact_name: str | None = None
    contact_phone: str | None = None
    manager_notes: str | None = None


class OrderCreate(OrderBase):
    pass


class OrderUpdate(BaseModel):
    status: OrderStatus | None = None
    coupon_id: uuid.UUID | None = None
    shipping_address: dict[str, Any] | None = None
    billing_address: dict[str, Any] | None = None
    notes: str | None = None
    delivery_method: DeliveryMethod | None = None
    payment_method: PaymentMethod | None = None
    contact_name: str | None = None
    contact_phone: str | None = None
    manager_notes: str | None = None


class OrderRead(OrderBase, TimestampedReadSchema):
    pass
