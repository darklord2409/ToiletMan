import uuid

from pydantic import BaseModel

from app.schemas.base import TimestampedReadSchema


class ProductImageBase(BaseModel):
    product_id: uuid.UUID
    url: str
    alt_text: str | None = None
    sort_order: int = 0
    is_primary: bool = False


class ProductImageCreate(ProductImageBase):
    pass


class ProductImageUpdate(BaseModel):
    url: str | None = None
    alt_text: str | None = None
    sort_order: int | None = None
    is_primary: bool | None = None


class ProductImageRead(ProductImageBase, TimestampedReadSchema):
    pass
