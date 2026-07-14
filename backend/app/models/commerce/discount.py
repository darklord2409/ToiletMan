import uuid
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, ForeignKey, Index, Numeric
from sqlalchemy import Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import AmountType, DiscountScope
from app.models.mixins import Entity

if TYPE_CHECKING:
    from app.models.catalog.category import Category
    from app.models.catalog.product import Product
    from app.models.commerce.promotion import Promotion


class Discount(Entity, Base):
    __tablename__ = "discounts"
    __table_args__ = (
        CheckConstraint("value >= 0", name="ck_discounts_value_non_negative"),
        Index("ix_discounts_promotion_id", "promotion_id"),
    )

    promotion_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("promotions.id", ondelete="CASCADE"), nullable=False
    )
    category_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("categories.id", ondelete="CASCADE")
    )
    product_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE")
    )
    scope: Mapped[DiscountScope] = mapped_column(
        SAEnum(DiscountScope, name="discount_scope"), nullable=False
    )
    amount_type: Mapped[AmountType] = mapped_column(
        SAEnum(AmountType, name="amount_type"), nullable=False
    )
    value: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)

    promotion: Mapped["Promotion"] = relationship(back_populates="discounts")
    category: Mapped["Category | None"] = relationship()
    product: Mapped["Product | None"] = relationship()
