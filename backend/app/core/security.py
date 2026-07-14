import re
import uuid
from datetime import UTC, datetime, timedelta
from typing import Any, Literal

from jose import jwt
from passlib.context import CryptContext

from app.core.config import settings
from app.exceptions.base import BadRequestError

# argon2 is the scheme used for every new hash; bcrypt stays listed only
# so accounts created before this migration keep verifying (passlib
# transparently upgrades them to argon2 on next successful login via
# hash_needs_update, see AuthService).
pwd_context = CryptContext(schemes=["argon2", "bcrypt"], deprecated=["bcrypt"])

Actor = Literal["admin", "customer"]

_PASSWORD_MIN_LENGTH = 8
_SPECIAL_CHARS = re.compile(r"[!@#$%^&*()\-_=+\[\]{};:'\",.<>/?\\|`~]")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def needs_rehash(hashed_password: str) -> bool:
    """True for legacy bcrypt hashes (or any non-default scheme) so
    callers can transparently upgrade them to argon2 right after a
    successful login, without forcing a password reset."""
    return pwd_context.needs_update(hashed_password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def validate_password_strength(password: str) -> None:
    """Raises BadRequestError (localized) on the first rule violated.
    Kept independent from Pydantic's own validators so it can be reused
    from plain service code (password reset, change-password) as well as
    schema-level validators."""
    if len(password) < _PASSWORD_MIN_LENGTH:
        raise BadRequestError(
            key="validation.password_min_length", params={"min_length": _PASSWORD_MIN_LENGTH}
        )
    if not any(c.isupper() for c in password):
        raise BadRequestError(key="validation.password_requires_uppercase")
    if not any(c.islower() for c in password):
        raise BadRequestError(key="validation.password_requires_lowercase")
    if not any(c.isdigit() for c in password):
        raise BadRequestError(key="validation.password_requires_digit")
    if not _SPECIAL_CHARS.search(password):
        raise BadRequestError(key="validation.password_requires_special")


def _create_token(
    subject: str,
    actor: Actor,
    token_type: Literal["access", "refresh"],
    expires_delta: timedelta,
    extra: dict[str, Any] | None = None,
) -> str:
    now = datetime.now(UTC)
    payload: dict[str, Any] = {
        "sub": subject,
        "actor": actor,
        "type": token_type,
        "iat": now,
        "exp": now + expires_delta,
    }
    if extra:
        payload.update(extra)
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_access_token(subject: str, actor: Actor) -> str:
    expires_delta = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return _create_token(subject, actor, "access", expires_delta)


def create_refresh_token(subject: str, actor: Actor) -> tuple[str, str]:
    """Returns (token, jti). The jti is stored server-side (Redis) so a
    refresh token can be revoked on logout instead of just expiring."""
    jti = str(uuid.uuid4())
    token = _create_token(
        subject,
        actor,
        "refresh",
        timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
        extra={"jti": jti},
    )
    return token, jti


def decode_token(token: str) -> dict[str, Any]:
    return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
