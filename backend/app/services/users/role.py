from app.models.users.role import Role
from app.schemas.users.role import RoleCreate, RoleUpdate
from app.services.base import BaseService


class RoleService(BaseService[Role, RoleCreate, RoleUpdate]):
    entity_name = "Role"
    resource = "roles"
    search_fields = ["name"]
