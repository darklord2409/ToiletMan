import uuid

from pydantic import BaseModel

from app.models.enums import ProductVideoType
from app.schemas.base import TimestampedReadSchema


class ProductVideoBase(BaseModel):
    product_id: uuid.UUID
    video_type: ProductVideoType
    title: str | None = None
    url: str
    thumbnail_url: str | None = None
    sort_order: int = 0


class ProductVideoCreate(ProductVideoBase):
    pass


class ProductVideoUpdate(BaseModel):
    video_type: ProductVideoType | None = None
    title: str | None = None
    url: str | None = None
    thumbnail_url: str | None = None
    sort_order: int | None = None


class ProductVideoRead(ProductVideoBase, TimestampedReadSchema):
    pass
