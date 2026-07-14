import uuid
from typing import TYPE_CHECKING

from sqlalchemy import BigInteger, ForeignKey, Index, Integer, String
from sqlalchemy import Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import ProductDocumentType
from app.models.mixins import Entity

if TYPE_CHECKING:
    from app.models.catalog.product import Product


class ProductDocument(Entity, Base):
    """PDF manuals, certificates, warranty cards, installation
    instructions, and exploded diagrams attached to a product."""

    __tablename__ = "product_documents"
    __table_args__ = (Index("ix_product_documents_product_id", "product_id"),)

    product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"), nullable=False
    )
    document_type: Mapped[ProductDocumentType] = mapped_column(
        SAEnum(ProductDocumentType, name="product_document_type"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    file_url: Mapped[str] = mapped_column(String(500), nullable=False)
    mime_type: Mapped[str | None] = mapped_column(String(150))
    size_bytes: Mapped[int | None] = mapped_column(BigInteger)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    product: Mapped["Product"] = relationship(back_populates="documents")
