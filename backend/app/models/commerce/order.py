import uuid
from decimal import Decimal
from typing import TYPE_CHECKING, Any

from sqlalchemy import CheckConstraint, ForeignKey, Index, Numeric, String, Text
from sqlalchemy import Enum as SAEnum
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import DeliveryMethod, OrderStatus, PaymentMethod
from app.models.mixins import Entity

if TYPE_CHECKING:
    from app.models.commerce.coupon import Coupon
    from app.models.commerce.order_item import OrderItem
    from app.models.users.customer import Customer


class Order(Entity, Base):
    __tablename__ = "orders"
    __table_args__ = (
        CheckConstraint("grand_total >= 0", name="ck_orders_grand_total_non_negative"),
        Index("ix_orders_customer_id", "customer_id"),
    )

    customer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("customers.id", ondelete="RESTRICT"), nullable=False
    )
    coupon_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("coupons.id", ondelete="SET NULL")
    )
    order_number: Mapped[str] = mapped_column(String(32), nullable=False, unique=True)
    status: Mapped[OrderStatus] = mapped_column(
        SAEnum(OrderStatus, name="order_status"), nullable=False, default=OrderStatus.PENDING
    )
    subtotal: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    discount_total: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    tax_total: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    shipping_total: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    grand_total: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="USD")
    shipping_address: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    billing_address: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    notes: Mapped[str | None] = mapped_column(Text)
    # Below: added for the customer-facing Mini App checkout (manual/cash
    # orders, no online payment) — nullable since existing admin-created
    # orders predate this and don't carry them.
    delivery_method: Mapped[DeliveryMethod | None] = mapped_column(
        SAEnum(DeliveryMethod, name="delivery_method")
    )
    payment_method: Mapped[PaymentMethod | None] = mapped_column(
        SAEnum(PaymentMethod, name="payment_method"), default=PaymentMethod.CASH
    )
    contact_name: Mapped[str | None] = mapped_column(String(150))
    contact_phone: Mapped[str | None] = mapped_column(String(32))
    # Free-text note an admin/manager can attach to an order — surfaced to
    # the customer in the Mini App's order detail view. Setting/changing
    # this (independent of `status`) is what triggers the bot's "manager
    # contacted you" notification (see services/notifications.py).
    manager_notes: Mapped[str | None] = mapped_column(Text)

    customer: Mapped["Customer"] = relationship(back_populates="orders")
    coupon: Mapped["Coupon | None"] = relationship(back_populates="orders")
    items: Mapped[list["OrderItem"]] = relationship(
        back_populates="order", cascade="all, delete-orphan"
    )
