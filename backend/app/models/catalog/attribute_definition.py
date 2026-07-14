import uuid
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, ForeignKey, Numeric, String
from sqlalchemy import Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import AttributeDataType
from app.models.mixins import Entity

if TYPE_CHECKING:
    from app.models.catalog.attribute_definition_translation import (
        AttributeDefinitionTranslation,
    )
    from app.models.catalog.attribute_group import AttributeGroup
    from app.models.catalog.product_attribute import ProductAttribute
    from app.models.catalog.unit import Unit


class AttributeDefinition(Entity, Base):
    """Describes a custom specification that can be attached to any
    product, e.g. "Voltage" (number, unit=V) or "Material" (reference,
    reference_type="material"). Global/generic — scoped to specific
    Product Types via AttributeSet/AttributeSetItem, not here."""

    __tablename__ = "attribute_definitions"

    unit_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("units.id", ondelete="SET NULL")
    )
    attribute_group_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("attribute_groups.id", ondelete="SET NULL")
    )
    code: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    data_type: Mapped[AttributeDataType] = mapped_column(
        SAEnum(AttributeDataType, name="attribute_data_type"), nullable=False
    )
    # Only meaningful when data_type == REFERENCE: which dictionary this
    # attribute's values are drawn from (e.g. "material", "color").
    reference_type: Mapped[str | None] = mapped_column(String(50))
    is_filterable: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    # Validation rules, enforced by the service layer when a ProductAttribute
    # value is written.
    validation_regex: Mapped[str | None] = mapped_column(String(500))
    min_value: Mapped[Decimal | None] = mapped_column(Numeric(18, 6))
    max_value: Mapped[Decimal | None] = mapped_column(Numeric(18, 6))

    unit: Mapped["Unit | None"] = relationship()
    attribute_group: Mapped["AttributeGroup | None"] = relationship(
        back_populates="attribute_definitions"
    )
    product_attributes: Mapped[list["ProductAttribute"]] = relationship(
        back_populates="attribute_definition"
    )
    translations: Mapped[list["AttributeDefinitionTranslation"]] = relationship(
        back_populates="attribute_definition", cascade="all, delete-orphan"
    )
