from fastapi import APIRouter, Depends, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.deps import get_db, get_redis
from app.core.i18n import translate
from app.core.rate_limit import rate_limit
from app.dependencies.auth import get_current_admin_user
from app.models.users.admin_user import AdminUser
from app.schemas.auth import (
    ChangePasswordRequest,
    LanguagePreference,
    LogoutRequest,
    PasswordResetConfirm,
    PasswordResetRequest,
    RefreshRequest,
    TokenResponse,
)
from app.schemas.users.admin_user import AdminUserRead
from app.services.auth import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])


def get_auth_service(
    session: AsyncSession = Depends(get_db), redis: Redis = Depends(get_redis)
) -> AuthService:
    return AuthService(session, redis)


def _client_ip(request: Request) -> str | None:
    return request.client.host if request.client else None


@router.post(
    "/login",
    response_model=TokenResponse,
    status_code=status.HTTP_200_OK,
    summary=translate("swagger.auth.login"),
    dependencies=[Depends(rate_limit("admin-login", settings.RATE_LIMIT_LOGIN_PER_MINUTE, 60))],
)
async def login(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    auth_service: AuthService = Depends(get_auth_service),
) -> TokenResponse:
    return await auth_service.login(
        form_data.username,
        form_data.password,
        _client_ip(request),
        request.headers.get("user-agent"),
    )


@router.post(
    "/refresh",
    response_model=TokenResponse,
    status_code=status.HTTP_200_OK,
    summary=translate("swagger.auth.refresh"),
    dependencies=[Depends(rate_limit("admin-refresh", 30, 60))],
)
async def refresh(
    payload: RefreshRequest, auth_service: AuthService = Depends(get_auth_service)
) -> TokenResponse:
    return await auth_service.refresh(payload.refresh_token)


@router.post(
    "/logout",
    status_code=status.HTTP_204_NO_CONTENT,
    summary=translate("swagger.auth.logout"),
)
async def logout(
    request: Request,
    payload: LogoutRequest,
    current_user: AdminUser = Depends(get_current_admin_user),
    auth_service: AuthService = Depends(get_auth_service),
) -> None:
    await auth_service.logout(payload.refresh_token, current_user.id, _client_ip(request))


@router.get(
    "/me",
    response_model=AdminUserRead,
    status_code=status.HTTP_200_OK,
    summary=translate("swagger.auth.me"),
)
async def me(current_user: AdminUser = Depends(get_current_admin_user)) -> AdminUser:
    return current_user


@router.patch(
    "/me/language",
    response_model=AdminUserRead,
    status_code=status.HTTP_200_OK,
    summary=translate("swagger.auth.update_language"),
)
async def update_my_language(
    payload: LanguagePreference,
    current_user: AdminUser = Depends(get_current_admin_user),
    session: AsyncSession = Depends(get_db),
) -> AdminUser:
    current_user.language = payload.language
    await session.commit()
    await session.refresh(current_user)
    return current_user


@router.post(
    "/change-password",
    status_code=status.HTTP_204_NO_CONTENT,
    summary=translate("swagger.auth.change_password"),
)
async def change_password(
    payload: ChangePasswordRequest,
    current_user: AdminUser = Depends(get_current_admin_user),
    auth_service: AuthService = Depends(get_auth_service),
) -> None:
    await auth_service.change_password(current_user, payload.current_password, payload.new_password)


@router.post(
    "/password-reset/request",
    status_code=status.HTTP_204_NO_CONTENT,
    summary=translate("swagger.auth.password_reset_request"),
    dependencies=[Depends(rate_limit("admin-reset-request", 5, 300))],
)
async def request_password_reset(
    payload: PasswordResetRequest, auth_service: AuthService = Depends(get_auth_service)
) -> None:
    await auth_service.request_password_reset(payload.email)


@router.post(
    "/password-reset/confirm",
    status_code=status.HTTP_204_NO_CONTENT,
    summary=translate("swagger.auth.password_reset_confirm"),
    dependencies=[Depends(rate_limit("admin-reset-confirm", 10, 300))],
)
async def confirm_password_reset(
    payload: PasswordResetConfirm, auth_service: AuthService = Depends(get_auth_service)
) -> None:
    await auth_service.confirm_password_reset(payload.token, payload.new_password)
