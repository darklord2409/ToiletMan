import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, ForeignKey, Index, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import Entity

if TYPE_CHECKING:
    from app.models.catalog.collection_translation import CollectionTranslation
    from app.models.catalog.manufacturer import Manufacturer
    from app.models.catalog.product import Product


class Collection(Entity, Base):
    """A manufacturer's named product line (e.g. Grohe's "Essence"
    collection) spanning multiple product types (faucet, mirror, cabinet,
    accessories) that a customer can browse as a complete set."""

    __tablename__ = "collections"
    __table_args__ = (Index("ix_collections_manufacturer_id", "manufacturer_id"),)

    manufacturer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("manufacturers.id", ondelete="CASCADE"), nullable=False
    )
    code: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    slug: Mapped[str] = mapped_column(String(160), nullable=False, unique=True)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    description: Mapped[str | None] = mapped_column(String(2000))
    image_url: Mapped[str | None] = mapped_column(String(500))
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    manufacturer: Mapped["Manufacturer"] = relationship(back_populates="collections")
    products: Mapped[list["Product"]] = relationship(back_populates="collection")
    translations: Mapped[list["CollectionTranslation"]] = relationship(
        back_populates="collection", cascade="all, delete-orphan"
    )
