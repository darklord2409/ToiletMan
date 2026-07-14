import uuid

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer, OAuth2PasswordBearer
from jose import JWTError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db
from app.core.i18n import translate
from app.core.security import decode_token
from app.exceptions.base import UnauthorizedError
from app.models.users.admin_user import AdminUser
from app.models.users.customer import Customer
from app.repositories.users.admin_user import AdminUserRepository
from app.repositories.users.customer import CustomerRepository

# Admin login is an OAuth2 password-form endpoint, so Swagger's built-in
# "Authorize" dialog can drive it directly. Customer login is a plain JSON
# body (email/password or Telegram initData) so it's modeled as a bare
# bearer token instead of an OAuth2 flow Swagger can't actually perform.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)
customer_bearer_scheme = HTTPBearer(
    auto_error=False, description=translate("swagger.customer_bearer_description")
)


def _decode_access_token(token: str | None, expected_actor: str) -> dict:
    if token is None:
        raise UnauthorizedError(key="errors.not_authenticated")
    try:
        payload = decode_token(token)
    except JWTError:
        raise UnauthorizedError(key="errors.token_expired_or_invalid") from None

    if payload.get("type") != "access":
        raise UnauthorizedError(key="errors.invalid_token_type")
    if payload.get("actor") != expected_actor:
        # A customer token used against an admin endpoint (or vice versa)
        # is treated the same as an invalid token, not a permission issue.
        raise UnauthorizedError(key="errors.invalid_token")
    if payload.get("sub") is None:
        raise UnauthorizedError(key="errors.invalid_token")
    return payload


async def get_current_admin_user(
    token: str | None = Depends(oauth2_scheme),
    session: AsyncSession = Depends(get_db),
) -> AdminUser:
    payload = _decode_access_token(token, expected_actor="admin")
    user = await AdminUserRepository(session).get(uuid.UUID(payload["sub"]))
    if user is None or not user.is_active:
        raise UnauthorizedError(key="errors.user_not_found_or_inactive")
    return user


async def get_current_customer(
    credentials: HTTPAuthorizationCredentials | None = Depends(customer_bearer_scheme),
    session: AsyncSession = Depends(get_db),
) -> Customer:
    token = credentials.credentials if credentials else None
    payload = _decode_access_token(token, expected_actor="customer")
    customer = await CustomerRepository(session).get(uuid.UUID(payload["sub"]))
    if customer is None or not customer.is_active:
        raise UnauthorizedError(key="errors.user_not_found_or_inactive")
    return customer
