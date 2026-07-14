import uuid
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Index, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import Entity

if TYPE_CHECKING:
    from app.models.catalog.product import Product
    from app.models.users.customer import Customer


class Favorite(Entity, Base):
    """A customer's saved/wishlisted product — Mini App "Favorites"."""

    __tablename__ = "favorites"
    __table_args__ = (
        UniqueConstraint("customer_id", "product_id", name="uq_favorite_customer_product"),
        Index("ix_favorites_customer_id", "customer_id"),
    )

    customer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("customers.id", ondelete="CASCADE"), nullable=False
    )
    product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"), nullable=False
    )

    customer: Mapped["Customer"] = relationship(back_populates="favorites")
    product: Mapped["Product"] = relationship(back_populates="favorited_by")
