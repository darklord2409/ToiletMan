import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Enum as SAEnum
from sqlalchemy import ForeignKey, Index, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import ProductVideoType
from app.models.mixins import Entity

if TYPE_CHECKING:
    from app.models.catalog.product import Product


class ProductVideo(Entity, Base):
    """YouTube / MP4 / externally-hosted video attached to a product."""

    __tablename__ = "product_videos"
    __table_args__ = (Index("ix_product_videos_product_id", "product_id"),)

    product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"), nullable=False
    )
    video_type: Mapped[ProductVideoType] = mapped_column(
        SAEnum(ProductVideoType, name="product_video_type"), nullable=False
    )
    title: Mapped[str | None] = mapped_column(String(255))
    url: Mapped[str] = mapped_column(String(500), nullable=False)
    thumbnail_url: Mapped[str | None] = mapped_column(String(500))
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    product: Mapped["Product"] = relationship(back_populates="videos")
