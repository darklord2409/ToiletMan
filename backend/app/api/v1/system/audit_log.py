import uuid
from typing import Any

from fastapi import Query

from app.api.v1.crud_router import build_crud_router
from app.core.i18n import translate
from app.dependencies.factory import make_service_dependency
from app.repositories.system.audit_log import AuditLogRepository
from app.schemas.system.audit_log import AuditLogCreate, AuditLogRead
from app.services.system.audit_log import AuditLogService

get_audit_log_service = make_service_dependency(AuditLogService, AuditLogRepository)


def audit_log_filters(
    entity_type: str | None = Query(None, description=translate("swagger.filters.entity_type")),
    entity_id: uuid.UUID | None = Query(None, description=translate("swagger.filters.entity_id")),
) -> dict[str, Any]:
    return {"entity_type": entity_type, "entity_id": entity_id}


router = build_crud_router(
    service_dependency=get_audit_log_service,
    read_schema=AuditLogRead,
    create_schema=AuditLogCreate,
    allow_delete=False,
    filter_dependency=audit_log_filters,
    prefix="/audit-logs",
    tags=["audit-logs"],
)
