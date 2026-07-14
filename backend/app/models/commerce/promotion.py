from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, String, Text
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import PromotionType
from app.models.mixins import Entity

if TYPE_CHECKING:
    from app.models.commerce.coupon import Coupon
    from app.models.commerce.discount import Discount


class Promotion(Entity, Base):
    __tablename__ = "promotions"

    name: Mapped[str] = mapped_column(String(150), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    promotion_type: Mapped[PromotionType] = mapped_column(
        SAEnum(PromotionType, name="promotion_type"), nullable=False
    )
    starts_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    ends_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    discounts: Mapped[list["Discount"]] = relationship(
        back_populates="promotion", cascade="all, delete-orphan"
    )
    coupons: Mapped[list["Coupon"]] = relationship(back_populates="promotion")
