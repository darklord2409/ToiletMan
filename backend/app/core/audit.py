import uuid
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.enums import ActorType
from app.models.system.audit_log import AuditLog


async def record_audit_log(
    session: AsyncSession,
    *,
    actor_type: ActorType | None,
    actor_id: uuid.UUID | None,
    action: str,
    entity_type: str,
    entity_id: uuid.UUID | None = None,
    changes: dict[str, Any] | None = None,
    ip_address: str | None = None,
) -> None:
    """Auth events (login/logout/refresh/password changes) are the
    highest-value audit trail and the one place this is wired in today;
    the audit_logs table + API also doubles as the "login history" view
    (filter by entity_type="admin_user" or "customer", action="login")."""
    session.add(
        AuditLog(
            actor_type=actor_type,
            actor_id=actor_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            changes=changes,
            ip_address=ip_address,
        )
    )
    await session.flush()
