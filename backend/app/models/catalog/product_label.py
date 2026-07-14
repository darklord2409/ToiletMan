from typing import TYPE_CHECKING

from sqlalchemy import Boolean, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import Entity

if TYPE_CHECKING:
    from app.models.catalog.product_label_assignment import ProductLabelAssignment
    from app.models.catalog.product_label_translation import ProductLabelTranslation


class ProductLabel(Entity, Base):
    """Configurable merchandising badge (e.g. "New", "Bestseller", "Sale",
    "Recommended", "Sales Leader", "Limited Edition") an administrator can
    define and attach to any number of products."""

    __tablename__ = "product_labels"

    code: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    badge_color: Mapped[str | None] = mapped_column(String(20))
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    assignments: Mapped[list["ProductLabelAssignment"]] = relationship(
        back_populates="product_label", cascade="all, delete-orphan"
    )
    translations: Mapped[list["ProductLabelTranslation"]] = relationship(
        back_populates="product_label", cascade="all, delete-orphan"
    )
