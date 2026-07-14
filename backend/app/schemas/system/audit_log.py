import uuid
from typing import Any

from pydantic import BaseModel

from app.models.enums import ActorType
from app.schemas.base import TimestampedReadSchema


class AuditLogBase(BaseModel):
    actor_type: ActorType | None = None
    actor_id: uuid.UUID | None = None
    action: str
    entity_type: str
    entity_id: uuid.UUID | None = None
    changes: dict[str, Any] | None = None
    ip_address: str | None = None


class AuditLogCreate(AuditLogBase):
    pass


class AuditLogRead(AuditLogBase, TimestampedReadSchema):
    pass
