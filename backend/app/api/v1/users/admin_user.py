import uuid

from fastapi import Depends, status
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.crud_router import build_crud_router
from app.core.deps import get_db, get_redis
from app.core.i18n import translate
from app.dependencies.factory import make_service_dependency
from app.dependencies.permissions import require_permission
from app.exceptions.base import NotFoundError
from app.repositories.users.admin_user import AdminUserRepository
from app.schemas.auth import AdminSessionRead
from app.schemas.users.admin_user import AdminUserCreate, AdminUserRead, AdminUserUpdate
from app.services.token_issuer import TokenIssuer
from app.services.users.admin_user import AdminUserService

get_admin_user_service = make_service_dependency(AdminUserService, AdminUserRepository)

router = build_crud_router(
    service_dependency=get_admin_user_service,
    read_schema=AdminUserRead,
    create_schema=AdminUserCreate,
    update_schema=AdminUserUpdate,
    prefix="/admin-users",
    tags=["admin-users"],
)


async def _get_admin_user_or_404(item_id: uuid.UUID, session: AsyncSession) -> None:
    user = await AdminUserRepository(session).get(item_id)
    if user is None:
        entity = translate("resource.admin-users")
        raise NotFoundError(key="errors.not_found", params={"entity": entity})


@router.get(
    "/{item_id}/sessions",
    response_model=list[AdminSessionRead],
    status_code=status.HTTP_200_OK,
    summary=translate("swagger.admin_users.sessions_list"),
    dependencies=[Depends(require_permission("admin-users.update"))],
)
async def list_admin_sessions(
    item_id: uuid.UUID,
    session: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
) -> list[dict]:
    await _get_admin_user_or_404(item_id, session)
    tokens = TokenIssuer(redis, actor="admin")
    return await tokens.list_sessions(str(item_id))


@router.delete(
    "/{item_id}/sessions/{jti}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary=translate("swagger.admin_users.sessions_revoke"),
    dependencies=[Depends(require_permission("admin-users.update"))],
)
async def revoke_admin_session(
    item_id: uuid.UUID,
    jti: str,
    session: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
) -> None:
    await _get_admin_user_or_404(item_id, session)
    tokens = TokenIssuer(redis, actor="admin")
    revoked = await tokens.revoke_jti(str(item_id), jti)
    if not revoked:
        raise NotFoundError(key="errors.session_not_found")


@router.delete(
    "/{item_id}/sessions",
    status_code=status.HTTP_204_NO_CONTENT,
    summary=translate("swagger.admin_users.sessions_revoke_all"),
    dependencies=[Depends(require_permission("admin-users.update"))],
)
async def revoke_all_admin_sessions(
    item_id: uuid.UUID,
    session: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
) -> None:
    await _get_admin_user_or_404(item_id, session)
    tokens = TokenIssuer(redis, actor="admin")
    await tokens.revoke_all(str(item_id))
