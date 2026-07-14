from pydantic import BaseModel

from app.schemas.base import TimestampedReadSchema


class ManufacturerBase(BaseModel):
    name: str
    slug: str
    description: str | None = None
    logo_url: str | None = None
    website_url: str | None = None
    is_active: bool = True


class ManufacturerCreate(ManufacturerBase):
    pass


class ManufacturerUpdate(BaseModel):
    name: str | None = None
    slug: str | None = None
    description: str | None = None
    logo_url: str | None = None
    website_url: str | None = None
    is_active: bool | None = None


class ManufacturerRead(ManufacturerBase, TimestampedReadSchema):
    pass
