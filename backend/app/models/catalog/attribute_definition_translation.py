import uuid
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Index, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import Entity

if TYPE_CHECKING:
    from app.models.catalog.attribute_definition import AttributeDefinition


class AttributeDefinitionTranslation(Entity, Base):
    __tablename__ = "attribute_definition_translations"
    __table_args__ = (
        UniqueConstraint(
            "attribute_definition_id", "locale", name="uq_attribute_definition_translation"
        ),
        Index("ix_attribute_definition_translations_parent", "attribute_definition_id"),
    )

    attribute_definition_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("attribute_definitions.id", ondelete="CASCADE"),
        nullable=False,
    )
    locale: Mapped[str] = mapped_column(String(5), nullable=False)
    name: Mapped[str] = mapped_column(String(150), nullable=False)

    attribute_definition: Mapped["AttributeDefinition"] = relationship(
        back_populates="translations"
    )
