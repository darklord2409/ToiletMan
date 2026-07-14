import uuid

from app.core.security import hash_password
from app.models.users.admin_user import AdminUser
from app.schemas.users.admin_user import AdminUserCreate, AdminUserUpdate
from app.services.base import BaseService


class AdminUserService(BaseService[AdminUser, AdminUserCreate, AdminUserUpdate]):
    entity_name = "Admin user"
    resource = "admin-users"
    search_fields = ["username", "email", "full_name"]

    async def create(self, obj_in: AdminUserCreate) -> AdminUser:
        data = obj_in.model_dump(exclude_unset=True)
        data["hashed_password"] = hash_password(data.pop("password"))
        return await self.repository.create(data)

    async def update(self, id: uuid.UUID, obj_in: AdminUserUpdate) -> AdminUser:
        data = obj_in.model_dump(exclude_unset=True)
        if password := data.pop("password", None):
            data["hashed_password"] = hash_password(password)
        db_obj = await self.get(id)
        return await self.repository.update(db_obj, data)
