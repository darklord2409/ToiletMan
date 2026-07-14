import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Enum as SAEnum
from sqlalchemy import ForeignKey, Index, Integer, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import RecommendationType
from app.models.mixins import Entity

if TYPE_CHECKING:
    from app.models.catalog.product import Product


class ProductRecommendation(Entity, Base):
    """A manually-curated directed link from one product to another —
    "related", "accessory", or "frequently bought together" — admin-edited
    (see MINI_APP.md/ADMIN_PANEL.md); "same collection"/"similar" are
    computed on the fly from existing category/manufacturer/product_type
    columns instead of stored here."""

    __tablename__ = "product_recommendations"
    __table_args__ = (
        UniqueConstraint(
            "product_id",
            "recommended_product_id",
            "relation_type",
            name="uq_product_recommendation",
        ),
        Index("ix_product_recommendations_product_id", "product_id"),
    )

    product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"), nullable=False
    )
    recommended_product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"), nullable=False
    )
    relation_type: Mapped[RecommendationType] = mapped_column(
        SAEnum(RecommendationType, name="recommendation_type"), nullable=False
    )
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    product: Mapped["Product"] = relationship(
        foreign_keys=[product_id], back_populates="recommendations_from"
    )
    recommended_product: Mapped["Product"] = relationship(
        foreign_keys=[recommended_product_id], back_populates="recommendations_to"
    )
