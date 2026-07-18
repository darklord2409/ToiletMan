import uuid
from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, CheckConstraint, DateTime, ForeignKey, Index, Numeric, String
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

    # Optional: a Discount is fully self-sufficient (own is_active/date
    # window below) so admins can create one directly without first setting
    # up a Promotion — grouping several under a named Promotion is an
    # optional extra, not a requirement.
    promotion_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("promotions.id", ondelete="CASCADE")
    )
    name: Mapped[str | None] = mapped_column(String(150))
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
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    starts_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    ends_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    promotion: Mapped["Promotion | None"] = relationship(back_populates="discounts")
    category: Mapped["Category | None"] = relationship()
    product: Mapped["Product | None"] = relationship()
