from app.models.users.permission import Permission
from app.schemas.users.permission import PermissionCreate, PermissionUpdate
from app.services.base import BaseService


class PermissionService(BaseService[Permission, PermissionCreate, PermissionUpdate]):
    entity_name = "Permission"
    resource = "permissions"
    search_fields = ["code"]
