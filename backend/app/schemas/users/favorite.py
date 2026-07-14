import uuid

from pydantic import BaseModel

from app.schemas.base import TimestampedReadSchema


class FavoriteBase(BaseModel):
    customer_id: uuid.UUID
    product_id: uuid.UUID


class FavoriteCreate(BaseModel):
    product_id: uuid.UUID


class FavoriteRead(FavoriteBase, TimestampedReadSchema):
    pass
