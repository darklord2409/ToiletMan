from datetime import datetime

from pydantic import BaseModel

from app.schemas.base import TimestampedReadSchema


class BannerBase(BaseModel):
    title: str
    image_url: str
    link_url: str | None = None
    sort_order: int = 0
    starts_at: datetime | None = None
    ends_at: datetime | None = None
    is_active: bool = True


class BannerCreate(BannerBase):
    pass


class BannerUpdate(BaseModel):
    title: str | None = None
    image_url: str | None = None
    link_url: str | None = None
    sort_order: int | None = None
    starts_at: datetime | None = None
    ends_at: datetime | None = None
    is_active: bool | None = None


class BannerRead(BannerBase, TimestampedReadSchema):
    pass
