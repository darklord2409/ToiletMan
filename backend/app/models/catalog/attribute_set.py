from typing import TYPE_CHECKING

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import Entity

if TYPE_CHECKING:
    from app.models.catalog.attribute_set_item import AttributeSetItem
    from app.models.catalog.product_type import ProductType


class AttributeSet(Entity, Base):
    """A named, reusable bundle of attribute definitions (e.g. "Faucet
    Specs") assignable to one or more Product Types. Reusable so several
    product types with overlapping specs (Kitchen/Bathroom/Outdoor Faucet)
    don't each need their own duplicated attribute list."""

    __tablename__ = "attribute_sets"

    code: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    description: Mapped[str | None] = mapped_column(String(500))

    items: Mapped[list["AttributeSetItem"]] = relationship(
        back_populates="attribute_set",
        cascade="all, delete-orphan",
        order_by="AttributeSetItem.sort_order",
    )
    product_types: Mapped[list["ProductType"]] = relationship(back_populates="attribute_set")
