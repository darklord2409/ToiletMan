from app.models.users.role_permission import RolePermission
from app.schemas.users.role_permission import RolePermissionCreate
from app.services.base import BaseService


class RolePermissionService(
    BaseService[RolePermission, RolePermissionCreate, RolePermissionCreate]
):
    """No update schema: a role/permission pairing is either present or
    deleted and recreated, never edited in place."""

    entity_name = "Role permission"
    resource = "role-permissions"
