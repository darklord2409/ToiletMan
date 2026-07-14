import uuid
from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Numeric, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import Entity

if TYPE_CHECKING:
    from app.models.catalog.attribute_definition import AttributeDefinition
    from app.models.catalog.product import Product
    from app.models.catalog.reference_value import ReferenceValue


class ProductAttribute(Entity, Base):
    """EAV row: one (product, attribute_definition) pair with a typed value.
    A product can carry an unlimited number of these."""

    __tablename__ = "product_attributes"
    __table_args__ = (
        UniqueConstraint(
            "product_id", "attribute_definition_id", name="uq_product_attribute_definition"
        ),
        Index("ix_product_attributes_product_id", "product_id"),
    )

    product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"), nullable=False
    )
    attribute_definition_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("attribute_definitions.id", ondelete="CASCADE"),
        nullable=False,
    )

    value_string: Mapped[str | None] = mapped_column(String(500))
    value_number: Mapped[Decimal | None] = mapped_column(Numeric(18, 6))
    value_boolean: Mapped[bool | None] = mapped_column(Boolean)
    value_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    value_reference_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("reference_values.id", ondelete="SET NULL")
    )

    product: Mapped["Product"] = relationship(back_populates="attributes")
    attribute_definition: Mapped["AttributeDefinition"] = relationship(
        back_populates="product_attributes"
    )
    value_reference: Mapped["ReferenceValue | None"] = relationship()
