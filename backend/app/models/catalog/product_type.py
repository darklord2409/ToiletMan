import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import Entity

if TYPE_CHECKING:
    from app.models.catalog.attribute_set import AttributeSet
    from app.models.catalog.product import Product
    from app.models.catalog.product_type_translation import ProductTypeTranslation


class ProductType(Entity, Base):
    """Defines a kind of product (e.g. "Kitchen Faucet", "Mirror") and, via
    `attribute_set`, which specifications are available for products of
    this type. Changing a product's type changes its available spec list."""

    __tablename__ = "product_types"

    attribute_set_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("attribute_sets.id", ondelete="RESTRICT"), nullable=False
    )
    code: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    # Fallback shown in the storefront/admin whenever a product of this type
    # has no image of its own — see storefront/catalog.py's primary-image
    # resolution.
    default_image_url: Mapped[str | None] = mapped_column(String(500))

    attribute_set: Mapped["AttributeSet"] = relationship(back_populates="product_types")
    products: Mapped[list["Product"]] = relationship(back_populates="product_type")
    translations: Mapped[list["ProductTypeTranslation"]] = relationship(
        back_populates="product_type", cascade="all, delete-orphan"
    )
