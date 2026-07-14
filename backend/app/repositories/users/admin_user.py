from sqlalchemy import func

from app.models.users.admin_user import AdminUser
from app.repositories.base import BaseRepository


class AdminUserRepository(BaseRepository[AdminUser]):
    model = AdminUser

    async def get_by_username(self, username: str) -> AdminUser | None:
        result = await self.session.execute(
            self._base_query().where(func.lower(AdminUser.username) == username.lower())
        )
        return result.scalar_one_or_none()
