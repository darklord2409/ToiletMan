from pydantic import BaseModel

from app.schemas.base import TimestampedReadSchema


class PermissionBase(BaseModel):
    code: str
    description: str | None = None


class PermissionCreate(PermissionBase):
    pass


class PermissionUpdate(BaseModel):
    code: str | None = None
    description: str | None = None


class PermissionRead(PermissionBase, TimestampedReadSchema):
    pass
