import uuid

from pydantic import BaseModel

from app.schemas.base import TimestampedReadSchema


class AttributeSetItemBase(BaseModel):
    attribute_set_id: uuid.UUID
    attribute_definition_id: uuid.UUID
    sort_order: int = 0
    is_required: bool = False
    is_visible: bool = True
    default_value: str | None = None


class AttributeSetItemCreate(AttributeSetItemBase):
    pass


class AttributeSetItemUpdate(BaseModel):
    sort_order: int | None = None
    is_required: bool | None = None
    is_visible: bool | None = None
    default_value: str | None = None


class AttributeSetItemRead(AttributeSetItemBase, TimestampedReadSchema):
    pass
