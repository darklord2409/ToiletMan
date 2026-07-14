import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, ForeignKey, Index, Integer, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import Entity

if TYPE_CHECKING:
    from app.models.catalog.attribute_definition import AttributeDefinition
    from app.models.catalog.attribute_set import AttributeSet


class AttributeSetItem(Entity, Base):
    """Membership of one AttributeDefinition in one AttributeSet, carrying
    per-set metadata (ordering/required/visible/default) — the same
    attribute can be required in one set and optional in another."""

    __tablename__ = "attribute_set_items"
    __table_args__ = (
        UniqueConstraint(
            "attribute_set_id", "attribute_definition_id", name="uq_attribute_set_item"
        ),
        Index("ix_attribute_set_items_set_id", "attribute_set_id"),
    )

    attribute_set_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("attribute_sets.id", ondelete="CASCADE"), nullable=False
    )
    attribute_definition_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("attribute_definitions.id", ondelete="CASCADE"),
        nullable=False,
    )
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_required: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_visible: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    default_value: Mapped[str | None] = mapped_column(String(500))

    attribute_set: Mapped["AttributeSet"] = relationship(back_populates="items")
    attribute_definition: Mapped["AttributeDefinition"] = relationship()
