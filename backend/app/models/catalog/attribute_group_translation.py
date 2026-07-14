import uuid
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Index, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import Entity

if TYPE_CHECKING:
    from app.models.catalog.attribute_group import AttributeGroup


class AttributeGroupTranslation(Entity, Base):
    __tablename__ = "attribute_group_translations"
    __table_args__ = (
        UniqueConstraint("attribute_group_id", "locale", name="uq_attribute_group_translation"),
        Index("ix_attribute_group_translations_parent", "attribute_group_id"),
    )

    attribute_group_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("attribute_groups.id", ondelete="CASCADE"), nullable=False
    )
    locale: Mapped[str] = mapped_column(String(5), nullable=False)
    name: Mapped[str] = mapped_column(String(150), nullable=False)

    attribute_group: Mapped["AttributeGroup"] = relationship(back_populates="translations")
