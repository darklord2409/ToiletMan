from pydantic import BaseModel

from app.schemas.base import TimestampedReadSchema


class RoleBase(BaseModel):
    name: str
    description: str | None = None


class RoleCreate(RoleBase):
    pass


class RoleUpdate(BaseModel):
    name: str | None = None
    description: str | None = None


class RoleRead(RoleBase, TimestampedReadSchema):
    pass
