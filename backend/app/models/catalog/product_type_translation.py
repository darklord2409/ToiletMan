import uuid
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Index, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import Entity

if TYPE_CHECKING:
    from app.models.catalog.product_type import ProductType


class ProductTypeTranslation(Entity, Base):
    __tablename__ = "product_type_translations"
    __table_args__ = (
        UniqueConstraint("product_type_id", "locale", name="uq_product_type_translation"),
        Index("ix_product_type_translations_parent", "product_type_id"),
    )

    product_type_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("product_types.id", ondelete="CASCADE"), nullable=False
    )
    locale: Mapped[str] = mapped_column(String(5), nullable=False)
    name: Mapped[str] = mapped_column(String(150), nullable=False)

    product_type: Mapped["ProductType"] = relationship(back_populates="translations")
