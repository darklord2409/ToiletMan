import uuid
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Index, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import Entity

if TYPE_CHECKING:
    from app.models.catalog.product import Product
    from app.models.catalog.product_label import ProductLabel


class ProductLabelAssignment(Entity, Base):
    """M2M join: which labels are attached to which products (a product
    can carry several labels at once, e.g. both "New" and "Sale")."""

    __tablename__ = "product_label_assignments"
    __table_args__ = (
        UniqueConstraint("product_id", "product_label_id", name="uq_product_label_assignment"),
        Index("ix_product_label_assignments_product_id", "product_id"),
    )

    product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"), nullable=False
    )
    product_label_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("product_labels.id", ondelete="CASCADE"), nullable=False
    )

    product: Mapped["Product"] = relationship(back_populates="label_assignments")
    product_label: Mapped["ProductLabel"] = relationship(back_populates="assignments")
