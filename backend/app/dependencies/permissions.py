import uuid
from collections.abc import Callable, Coroutine
from typing import Any

from fastapi import Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db
from app.core.i18n import permission_display_name
from app.dependencies.auth import get_current_admin_user
from app.exceptions.base import ForbiddenError
from app.models.users.admin_user import AdminUser
from app.models.users.permission import Permission
from app.models.users.role_permission import RolePermission


async def _load_role_permission_codes(session: AsyncSession, role_id: uuid.UUID) -> set[str]:
    result = await session.execute(
        select(Permission.code)
        .join(RolePermission, RolePermission.permission_id == Permission.id)
        .where(
            RolePermission.role_id == role_id,
            RolePermission.deleted_at.is_(None),
            Permission.deleted_at.is_(None),
        )
    )
    return set(result.scalars().all())


def require_permission(code: str) -> Callable[..., Coroutine[Any, Any, AdminUser]]:
    """FastAPI dependency factory: returns a dependency that only lets the
    request through if the current admin user is a superuser or their role
    has been granted `code` (e.g. "products.update"). Superusers (Super
    Admin) always bypass the check."""

    async def _dependency(
        current_user: AdminUser = Depends(get_current_admin_user),
        session: AsyncSession = Depends(get_db),
    ) -> AdminUser:
        if current_user.is_superuser:
            return current_user

        if current_user.role_id is not None:
            codes = await _load_role_permission_codes(session, current_user.role_id)
            if code in codes:
                return current_user

        raise ForbiddenError(
            key="errors.permission_denied", params={"permission": permission_display_name(code)}
        )

    return _dependency
