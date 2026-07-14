import uuid

from pydantic import BaseModel

from app.schemas.base import TimestampedReadSchema


class RolePermissionBase(BaseModel):
    role_id: uuid.UUID
    permission_id: uuid.UUID


class RolePermissionCreate(RolePermissionBase):
    pass


class RolePermissionRead(RolePermissionBase, TimestampedReadSchema):
    pass
