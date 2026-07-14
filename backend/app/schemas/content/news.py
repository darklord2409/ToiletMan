import uuid
from datetime import datetime

from pydantic import BaseModel

from app.schemas.base import TimestampedReadSchema


class NewsBase(BaseModel):
    author_id: uuid.UUID | None = None
    title: str
    slug: str
    excerpt: str | None = None
    content: str
    cover_image_url: str | None = None
    is_published: bool = False
    published_at: datetime | None = None


class NewsCreate(NewsBase):
    pass


class NewsUpdate(BaseModel):
    author_id: uuid.UUID | None = None
    title: str | None = None
    slug: str | None = None
    excerpt: str | None = None
    content: str | None = None
    cover_image_url: str | None = None
    is_published: bool | None = None
    published_at: datetime | None = None


class NewsRead(NewsBase, TimestampedReadSchema):
    pass
