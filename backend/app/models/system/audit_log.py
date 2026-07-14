import uuid
from typing import Any

from sqlalchemy import Enum as SAEnum
from sqlalchemy import Index, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.enums import ActorType
from app.models.mixins import Entity


class AuditLog(Entity, Base):
    """actor_id is intentionally not a foreign key: the actor can be a
    customer, an admin user, or the system itself (see actor_type), so a
    single-column FK isn't possible without a polymorphic association."""

    __tablename__ = "audit_logs"
    __table_args__ = (
        Index("ix_audit_logs_entity", "entity_type", "entity_id"),
        Index("ix_audit_logs_actor", "actor_type", "actor_id"),
    )

    actor_type: Mapped[ActorType | None] = mapped_column(
        SAEnum(ActorType, name="actor_type")
    )
    actor_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    action: Mapped[str] = mapped_column(String(100), nullable=False)
    entity_type: Mapped[str] = mapped_column(String(100), nullable=False)
    entity_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    changes: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    ip_address: Mapped[str | None] = mapped_column(String(64))
