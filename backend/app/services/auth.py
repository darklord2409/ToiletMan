import uuid
from datetime import UTC, datetime, timedelta

from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.audit import record_audit_log
from app.core.config import settings
from app.core.security import (
    hash_password,
    needs_rehash,
    validate_password_strength,
    verify_password,
)
from app.exceptions.base import BadRequestError, UnauthorizedError
from app.models.enums import ActorType
from app.models.users.admin_user import AdminUser
from app.repositories.users.admin_user import AdminUserRepository
from app.schemas.auth import TokenResponse
from app.services.token_issuer import TokenIssuer

_RESET_KEY_PREFIX = "pwd_reset:admin:"


class AuthService:
    """Admin-facing authentication: username/email + password login,
    refresh/logout/token-revocation, and the password-reset flow. Not a
    BaseService subclass — this isn't a CRUD resource, it's a stateful
    flow over AdminUserRepository plus Redis (refresh-token allowlist and
    one-time password-reset tokens)."""

    def __init__(self, session: AsyncSession, redis: Redis) -> None:
        self.session = session
        self.redis = redis
        self.repository = AdminUserRepository(session)
        self.tokens = TokenIssuer(redis, actor="admin")

    async def authenticate(
        self, username_or_email: str, password: str, ip_address: str | None
    ) -> AdminUser:
        user = await self.repository.get_by_username(username_or_email)
        if user is None:
            user = await self._get_by_email(username_or_email)

        password_ok = user and verify_password(password, user.hashed_password)
        if user is None or not user.is_active or not password_ok:
            await record_audit_log(
                self.session,
                actor_type=ActorType.ADMIN_USER,
                actor_id=user.id if user else None,
                action="login_failed",
                entity_type="admin_user",
                entity_id=user.id if user else None,
                ip_address=ip_address,
            )
            raise UnauthorizedError(key="errors.incorrect_credentials")

        if needs_rehash(user.hashed_password):
            user.hashed_password = hash_password(password)
            await self.session.flush()

        return user

    async def _get_by_email(self, email: str) -> AdminUser | None:
        from sqlalchemy import func

        result = await self.session.execute(
            self.repository._base_query().where(func.lower(AdminUser.email) == email.lower())  # noqa: SLF001
        )
        return result.scalar_one_or_none()

    async def login(
        self,
        username_or_email: str,
        password: str,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> TokenResponse:
        user = await self.authenticate(username_or_email, password, ip_address)
        user.last_login_at = datetime.now(UTC)
        await self.session.flush()
        await record_audit_log(
            self.session,
            actor_type=ActorType.ADMIN_USER,
            actor_id=user.id,
            action="login",
            entity_type="admin_user",
            entity_id=user.id,
            ip_address=ip_address,
        )
        return await self.tokens.issue(str(user.id), user_agent=user_agent, ip_address=ip_address)

    async def refresh(self, refresh_token: str) -> TokenResponse:
        subject, tokens = await self.tokens.rotate(refresh_token)
        user = await self.repository.get(uuid.UUID(subject))
        if user is None or not user.is_active:
            raise UnauthorizedError(key="errors.user_not_found_or_inactive")
        return tokens

    async def logout(
        self, refresh_token: str | None, actor_id: uuid.UUID | None, ip_address: str | None
    ) -> None:
        await self.tokens.revoke(refresh_token)
        if actor_id:
            await record_audit_log(
                self.session,
                actor_type=ActorType.ADMIN_USER,
                actor_id=actor_id,
                action="logout",
                entity_type="admin_user",
                entity_id=actor_id,
                ip_address=ip_address,
            )

    async def change_password(
        self, user: AdminUser, current_password: str, new_password: str
    ) -> None:
        if not verify_password(current_password, user.hashed_password):
            raise UnauthorizedError(key="errors.incorrect_credentials")
        validate_password_strength(new_password)
        user.hashed_password = hash_password(new_password)
        await self.session.flush()
        await self.tokens.revoke_all(str(user.id))
        await record_audit_log(
            self.session,
            actor_type=ActorType.ADMIN_USER,
            actor_id=user.id,
            action="password_changed",
            entity_type="admin_user",
            entity_id=user.id,
        )

    async def request_password_reset(self, email: str) -> None:
        """Always succeeds from the caller's perspective (no user
        enumeration). If the email matches an active admin, a one-time
        token is minted and logged (no email/SMS gateway is configured in
        this environment, so delivery is a documented stub — the
        verify/confirm half of the flow is fully functional)."""
        user = await self._get_by_email(email)
        if user is None or not user.is_active:
            return

        token = uuid.uuid4().hex
        await self.redis.set(
            f"{_RESET_KEY_PREFIX}{token}",
            str(user.id),
            ex=timedelta(minutes=settings.PASSWORD_RESET_TOKEN_EXPIRE_MINUTES),
        )
        from loguru import logger

        logger.info("Password reset token for admin {}: {} (would be emailed)", email, token)

    async def confirm_password_reset(self, token: str, new_password: str) -> None:
        subject = await self.redis.get(f"{_RESET_KEY_PREFIX}{token}")
        if subject is None:
            raise BadRequestError(key="errors.reset_token_invalid")

        await self.redis.delete(f"{_RESET_KEY_PREFIX}{token}")
        validate_password_strength(new_password)

        user = await self.repository.get(uuid.UUID(subject))
        if user is None:
            raise BadRequestError(key="errors.reset_token_invalid")

        user.hashed_password = hash_password(new_password)
        await self.session.flush()
        await self.tokens.revoke_all(str(user.id))
        await record_audit_log(
            self.session,
            actor_type=ActorType.ADMIN_USER,
            actor_id=user.id,
            action="password_reset",
            entity_type="admin_user",
            entity_id=user.id,
        )
