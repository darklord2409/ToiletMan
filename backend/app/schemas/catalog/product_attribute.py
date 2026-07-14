import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel

from app.schemas.base import TimestampedReadSchema


class ProductAttributeBase(BaseModel):
    product_id: uuid.UUID
    attribute_definition_id: uuid.UUID
    value_string: str | None = None
    value_number: Decimal | None = None
    value_boolean: bool | None = None
    value_date: datetime | None = None
    value_reference_id: uuid.UUID | None = None


class ProductAttributeCreate(ProductAttributeBase):
    pass


class ProductAttributeUpdate(BaseModel):
    value_string: str | None = None
    value_number: Decimal | None = None
    value_boolean: bool | None = None
    value_date: datetime | None = None
    value_reference_id: uuid.UUID | None = None


class ProductAttributeRead(ProductAttributeBase, TimestampedReadSchema):
    pass
