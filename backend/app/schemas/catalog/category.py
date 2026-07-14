import uuid

from pydantic import BaseModel

from app.schemas.base import TimestampedReadSchema


class CategoryBase(BaseModel):
    parent_id: uuid.UUID | None = None
    name: str
    slug: str
    description: str | None = None
    sort_order: int = 0
    is_active: bool = True
    is_featured: bool = False
    image_url: str | None = None


class CategoryCreate(CategoryBase):
    pass


class CategoryUpdate(BaseModel):
    parent_id: uuid.UUID | None = None
    name: str | None = None
    slug: str | None = None
    description: str | None = None
    sort_order: int | None = None
    is_active: bool | None = None
    is_featured: bool | None = None
    image_url: str | None = None


class CategoryRead(CategoryBase, TimestampedReadSchema):
    pass
