from pydantic import BaseModel

from app.schemas.base import TimestampedReadSchema


class AttributeSetBase(BaseModel):
    code: str
    name: str
    description: str | None = None


class AttributeSetCreate(AttributeSetBase):
    pass


class AttributeSetUpdate(BaseModel):
    code: str | None = None
    name: str | None = None
    description: str | None = None


class AttributeSetRead(AttributeSetBase, TimestampedReadSchema):
    pass
