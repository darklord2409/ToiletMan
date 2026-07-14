import uuid
from typing import Any

from fastapi import Query

from app.api.v1.crud_router import build_crud_router
from app.core.i18n import translate
from app.dependencies.factory import make_service_dependency
from app.repositories.users.role_permission import RolePermissionRepository
from app.schemas.users.role_permission import RolePermissionCreate, RolePermissionRead
from app.services.users.role_permission import RolePermissionService

get_role_permission_service = make_service_dependency(
    RolePermissionService, RolePermissionRepository
)


def role_permission_filters(
    role_id: uuid.UUID | None = Query(None, description=translate("swagger.filters.role_id")),
    permission_id: uuid.UUID | None = Query(
        None, description=translate("swagger.filters.permission_id")
    ),
) -> dict[str, Any]:
    return {"role_id": role_id, "permission_id": permission_id}


router = build_crud_router(
    service_dependency=get_role_permission_service,
    read_schema=RolePermissionRead,
    create_schema=RolePermissionCreate,
    filter_dependency=role_permission_filters,
    prefix="/role-permissions",
    tags=["role-permissions"],
)
