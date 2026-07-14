import uuid
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Index, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import Entity

if TYPE_CHECKING:
    from app.models.catalog.reference_value import ReferenceValue


class ReferenceValueTranslation(Entity, Base):
    __tablename__ = "reference_value_translations"
    __table_args__ = (
        UniqueConstraint("reference_value_id", "locale", name="uq_reference_value_translation"),
        Index("ix_reference_value_translations_parent", "reference_value_id"),
    )

    reference_value_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("reference_values.id", ondelete="CASCADE"), nullable=False
    )
    locale: Mapped[str] = mapped_column(String(5), nullable=False)
    name: Mapped[str] = mapped_column(String(150), nullable=False)

    reference_value: Mapped["ReferenceValue"] = relationship(back_populates="translations")
