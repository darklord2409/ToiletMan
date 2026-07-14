from app.api.v1.crud_router import build_crud_router
from app.dependencies.factory import make_service_dependency
from app.repositories.users.role import RoleRepository
from app.schemas.users.role import RoleCreate, RoleRead, RoleUpdate
from app.services.users.role import RoleService

get_role_service = make_service_dependency(RoleService, RoleRepository)

router = build_crud_router(
    service_dependency=get_role_service,
    read_schema=RoleRead,
    create_schema=RoleCreate,
    update_schema=RoleUpdate,
    prefix="/roles",
    tags=["roles"],
)
