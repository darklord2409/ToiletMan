import uuid
from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING, Any

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Computed,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
)
from sqlalchemy import Enum as SAEnum
from sqlalchemy.dialects.postgresql import JSONB, TSVECTOR, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import ProductStatus
from app.models.mixins import Entity

if TYPE_CHECKING:
    from app.models.catalog.category import Category
    from app.models.catalog.collection import Collection
    from app.models.catalog.manufacturer import Manufacturer
    from app.models.catalog.product_analytics_event import ProductAnalyticsEvent
    from app.models.catalog.product_attribute import ProductAttribute
    from app.models.catalog.product_document import ProductDocument
    from app.models.catalog.product_image import ProductImage
    from app.models.catalog.product_label_assignment import ProductLabelAssignment
    from app.models.catalog.product_recommendation import ProductRecommendation
    from app.models.catalog.product_translation import ProductTranslation
    from app.models.catalog.product_type import ProductType
    from app.models.catalog.product_video import ProductVideo
    from app.models.catalog.unit import Unit
    from app.models.commerce.cart_item import CartItem
    from app.models.commerce.order_item import OrderItem
    from app.models.system.price_history import PriceHistory
    from app.models.users.favorite import Favorite

# Full-text search over the fallback (default-locale) content: name, SKU,
# slug, barcode, description. Per-locale FTS over ProductTranslation rows
# is a documented future enhancement (see CATALOG.md) — this covers the
# 100%-populated base columns, which is what most search traffic hits.
_SEARCH_VECTOR_EXPRESSION = (
    "to_tsvector('russian', "
    "coalesce(name, '') || ' ' || coalesce(sku, '') || ' ' || "
    "coalesce(slug, '') || ' ' || coalesce(barcode, '') || ' ' || "
    "coalesce(description, ''))"
)


class Product(Entity, Base):
    __tablename__ = "products"
    __table_args__ = (
        CheckConstraint("price >= 0", name="ck_products_price_non_negative"),
        CheckConstraint("stock_quantity >= 0", name="ck_products_stock_non_negative"),
        CheckConstraint("reserved_quantity >= 0", name="ck_products_reserved_non_negative"),
        Index("ix_products_category_id", "category_id"),
        Index("ix_products_manufacturer_id", "manufacturer_id"),
        Index("ix_products_product_type_id", "product_type_id"),
        Index("ix_products_collection_id", "collection_id"),
        Index("ix_products_status", "status"),
        Index("ix_products_search_vector", "search_vector", postgresql_using="gin"),
    )

    category_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("categories.id", ondelete="RESTRICT"), nullable=False
    )
    manufacturer_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("manufacturers.id", ondelete="SET NULL")
    )
    unit_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("units.id", ondelete="RESTRICT"), nullable=False
    )
    product_type_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("product_types.id", ondelete="RESTRICT"), nullable=False
    )
    collection_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("collections.id", ondelete="SET NULL")
    )

    sku: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    barcode: Mapped[str | None] = mapped_column(String(64), unique=True)
    slug: Mapped[str] = mapped_column(String(220), nullable=False, unique=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    status: Mapped[ProductStatus] = mapped_column(
        SAEnum(ProductStatus, name="product_status"),
        nullable=False,
        default=ProductStatus.DRAFT,
        server_default=ProductStatus.DRAFT.value,
    )
    is_featured: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    weight_kg: Mapped[Decimal | None] = mapped_column(Numeric(10, 3))

    # Pricing
    price: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    compare_at_price: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    cost_price: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    sale_price: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    future_price: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    future_price_activates_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="UZS")

    # Inventory
    stock_quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    reserved_quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_unlimited_stock: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    low_stock_threshold: Mapped[int | None] = mapped_column(Integer)

    # SEO
    canonical_url_override: Mapped[str | None] = mapped_column(String(500))
    seo: Mapped[dict[str, Any] | None] = mapped_column(JSONB)

    search_vector: Mapped[str | None] = mapped_column(
        TSVECTOR, Computed(_SEARCH_VECTOR_EXPRESSION, persisted=True)
    )

    category: Mapped["Category"] = relationship(back_populates="products")
    manufacturer: Mapped["Manufacturer | None"] = relationship(back_populates="products")
    unit: Mapped["Unit"] = relationship(back_populates="products")
    product_type: Mapped["ProductType"] = relationship(back_populates="products")
    collection: Mapped["Collection | None"] = relationship(back_populates="products")
    images: Mapped[list["ProductImage"]] = relationship(
        back_populates="product",
        cascade="all, delete-orphan",
        order_by="ProductImage.sort_order",
    )
    attributes: Mapped[list["ProductAttribute"]] = relationship(
        back_populates="product", cascade="all, delete-orphan"
    )
    documents: Mapped[list["ProductDocument"]] = relationship(
        back_populates="product",
        cascade="all, delete-orphan",
        order_by="ProductDocument.sort_order",
    )
    videos: Mapped[list["ProductVideo"]] = relationship(
        back_populates="product", cascade="all, delete-orphan", order_by="ProductVideo.sort_order"
    )
    label_assignments: Mapped[list["ProductLabelAssignment"]] = relationship(
        back_populates="product", cascade="all, delete-orphan"
    )
    translations: Mapped[list["ProductTranslation"]] = relationship(
        back_populates="product", cascade="all, delete-orphan"
    )
    # passive_deletes: CartItem.product_id is NOT NULL with ondelete="CASCADE"
    # at the DB level — without this, SQLAlchemy's default (no ORM-level
    # delete cascade configured) is to try nulling the FK on any loaded
    # cart_items when the product is deleted, which the NOT NULL constraint
    # then rejects. This trusts the DB's own CASCADE instead.
    cart_items: Mapped[list["CartItem"]] = relationship(
        back_populates="product", passive_deletes=True
    )
    order_items: Mapped[list["OrderItem"]] = relationship(back_populates="product")
    price_history: Mapped[list["PriceHistory"]] = relationship(
        back_populates="product", cascade="all, delete-orphan"
    )
    favorited_by: Mapped[list["Favorite"]] = relationship(
        back_populates="product", cascade="all, delete-orphan"
    )
    recommendations_from: Mapped[list["ProductRecommendation"]] = relationship(
        foreign_keys="ProductRecommendation.product_id",
        back_populates="product",
        passive_deletes=True,
    )
    recommendations_to: Mapped[list["ProductRecommendation"]] = relationship(
        foreign_keys="ProductRecommendation.recommended_product_id",
        back_populates="recommended_product",
        passive_deletes=True,
    )
    analytics_events: Mapped[list["ProductAnalyticsEvent"]] = relationship(
        back_populates="product", passive_deletes=True
    )
