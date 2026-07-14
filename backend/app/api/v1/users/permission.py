from app.api.v1.crud_router import build_crud_router
from app.dependencies.factory import make_service_dependency
from app.repositories.users.permission import PermissionRepository
from app.schemas.users.permission import PermissionCreate, PermissionRead, PermissionUpdate
from app.services.users.permission import PermissionService

get_permission_service = make_service_dependency(PermissionService, PermissionRepository)

router = build_crud_router(
    service_dependency=get_permission_service,
    read_schema=PermissionRead,
    create_schema=PermissionCreate,
    update_schema=PermissionUpdate,
    prefix="/permissions",
    tags=["permissions"],
)
