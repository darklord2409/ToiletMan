import uuid
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Index, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import Entity

if TYPE_CHECKING:
    from app.models.catalog.collection import Collection


class CollectionTranslation(Entity, Base):
    __tablename__ = "collection_translations"
    __table_args__ = (
        UniqueConstraint("collection_id", "locale", name="uq_collection_translation"),
        Index("ix_collection_translations_parent", "collection_id"),
    )

    collection_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("collections.id", ondelete="CASCADE"), nullable=False
    )
    locale: Mapped[str] = mapped_column(String(5), nullable=False)
    name: Mapped[str | None] = mapped_column(String(150))
    description: Mapped[str | None] = mapped_column(String(2000))

    collection: Mapped["Collection"] = relationship(back_populates="translations")
