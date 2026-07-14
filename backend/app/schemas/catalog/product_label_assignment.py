import uuid

from pydantic import BaseModel

from app.schemas.base import TimestampedReadSchema


class ProductLabelAssignmentBase(BaseModel):
    product_id: uuid.UUID
    product_label_id: uuid.UUID


class ProductLabelAssignmentCreate(ProductLabelAssignmentBase):
    pass


class ProductLabelAssignmentRead(ProductLabelAssignmentBase, TimestampedReadSchema):
    pass
