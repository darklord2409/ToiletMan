from typing import Any

from pydantic import BaseModel

from app.schemas.base import TimestampedReadSchema


class SiteSettingBase(BaseModel):
    key: str
    value: dict[str, Any] | None = None
    description: str | None = None


class SiteSettingCreate(SiteSettingBase):
    pass


class SiteSettingUpdate(BaseModel):
    value: dict[str, Any] | None = None
    description: str | None = None


class SiteSettingRead(SiteSettingBase, TimestampedReadSchema):
    pass
