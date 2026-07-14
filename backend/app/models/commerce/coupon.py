import uuid
from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, CheckConstraint, DateTime, ForeignKey, Integer, Numeric, String
from sqlalchemy import Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import AmountType
from app.models.mixins import Entity

if TYPE_CHECKING:
    from app.models.commerce.order import Order
    from app.models.commerce.promotion import Promotion


class Coupon(Entity, Base):
    __tablename__ = "coupons"
    __table_args__ = (
        CheckConstraint(
            "usage_limit IS NULL OR usage_limit > 0", name="ck_coupons_usage_limit_positive"
        ),
        CheckConstraint(
            "discount_value >= 0", name="ck_coupons_discount_value_non_negative"
        ),
    )

    promotion_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("promotions.id", ondelete="SET NULL")
    )
    code: Mapped[str] = mapped_column(String(50), nullable=False, unique=True)
    amount_type: Mapped[AmountType] = mapped_column(
        SAEnum(AmountType, name="amount_type"), nullable=False
    )
    discount_value: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    min_order_amount: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    usage_limit: Mapped[int | None] = mapped_column(Integer)
    usage_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    starts_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    ends_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    promotion: Mapped["Promotion | None"] = relationship(back_populates="coupons")
    orders: Mapped[list["Order"]] = relationship(back_populates="coupon")
