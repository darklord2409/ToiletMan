import uuid
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Index, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import Entity

if TYPE_CHECKING:
    from app.models.catalog.product_label import ProductLabel


class ProductLabelTranslation(Entity, Base):
    __tablename__ = "product_label_translations"
    __table_args__ = (
        UniqueConstraint("product_label_id", "locale", name="uq_product_label_translation"),
        Index("ix_product_label_translations_parent", "product_label_id"),
    )

    product_label_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("product_labels.id", ondelete="CASCADE"), nullable=False
    )
    locale: Mapped[str] = mapped_column(String(5), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)

    product_label: Mapped["ProductLabel"] = relationship(back_populates="translations")
