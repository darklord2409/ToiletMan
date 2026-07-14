from pydantic import BaseModel

from app.schemas.base import TimestampedReadSchema


class StaticPageBase(BaseModel):
    title: str
    slug: str
    content: str
    is_published: bool = True


class StaticPageCreate(StaticPageBase):
    pass


class StaticPageUpdate(BaseModel):
    title: str | None = None
    slug: str | None = None
    content: str | None = None
    is_published: bool | None = None


class StaticPageRead(StaticPageBase, TimestampedReadSchema):
    pass
