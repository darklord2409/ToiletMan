from typing import TYPE_CHECKING

from sqlalchemy import Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import Entity

if TYPE_CHECKING:
    from app.models.catalog.attribute_definition import AttributeDefinition
    from app.models.catalog.attribute_group_translation import AttributeGroupTranslation


class AttributeGroup(Entity, Base):
    """Groups related attribute definitions for display purposes, e.g.
    "Dimensions", "Materials & Finish", "Technical"."""

    __tablename__ = "attribute_groups"

    code: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    attribute_definitions: Mapped[list["AttributeDefinition"]] = relationship(
        back_populates="attribute_group"
    )
    translations: Mapped[list["AttributeGroupTranslation"]] = relationship(
        back_populates="attribute_group", cascade="all, delete-orphan"
    )
