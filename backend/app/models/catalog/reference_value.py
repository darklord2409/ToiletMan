from typing import TYPE_CHECKING

from sqlalchemy import Boolean, Index, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import Entity

if TYPE_CHECKING:
    from app.models.catalog.reference_value_translation import ReferenceValueTranslation


class ReferenceValue(Entity, Base):
    """A single entry in one of the shared reference dictionaries
    (materials, colors, countries, finishes, installation types, shapes,
    warranty periods, connection types, thread sizes, water outlet types),
    discriminated by `reference_type` so all of them share one table
    instead of one near-identical table each. Products reference these by
    id (via ProductAttribute.value_reference_id) instead of storing
    duplicated free text."""

    __tablename__ = "reference_values"
    __table_args__ = (
        UniqueConstraint("reference_type", "code", name="uq_reference_value_type_code"),
        Index("ix_reference_values_type", "reference_type"),
    )

    reference_type: Mapped[str] = mapped_column(String(50), nullable=False)
    code: Mapped[str] = mapped_column(String(100), nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    translations: Mapped[list["ReferenceValueTranslation"]] = relationship(
        back_populates="reference_value", cascade="all, delete-orphan"
    )
