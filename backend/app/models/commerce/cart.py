import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Enum as SAEnum
from sqlalchemy import ForeignKey, Index, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import CartStatus
from app.models.mixins import Entity

if TYPE_CHECKING:
    from app.models.commerce.cart_item import CartItem
    from app.models.users.customer import Customer


class Cart(Entity, Base):
    __tablename__ = "carts"
    __table_args__ = (Index("ix_carts_customer_id", "customer_id"),)

    customer_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("customers.id", ondelete="CASCADE")
    )
    session_token: Mapped[str | None] = mapped_column(String(255), unique=True)
    status: Mapped[CartStatus] = mapped_column(
        SAEnum(CartStatus, name="cart_status"), nullable=False, default=CartStatus.ACTIVE
    )

    customer: Mapped["Customer | None"] = relationship(back_populates="carts")
    items: Mapped[list["CartItem"]] = relationship(
        back_populates="cart", cascade="all, delete-orphan"
    )
