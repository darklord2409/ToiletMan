from app.models.system.audit_log import AuditLog
from app.schemas.system.audit_log import AuditLogCreate
from app.services.base import BaseService


class AuditLogService(BaseService[AuditLog, AuditLogCreate, AuditLogCreate]):
    """Append-only: no update schema, deletion disabled at the router."""

    entity_name = "Audit log"
    resource = "audit-logs"
    search_fields = ["action", "entity_type"]
