from datetime import UTC, datetime, timedelta
from typing import Any

from jose import JWTError
from redis.asyncio import Redis

from app.core.config import settings
from app.core.security import Actor, create_access_token, create_refresh_token, decode_token
from app.exceptions.base import UnauthorizedError
from app.schemas.auth import TokenResponse

_REFRESH_KEY_PREFIX = "refresh_token:"
_USER_SESSIONS_PREFIX = "user_sessions:"
_SESSION_META_PREFIX = "session_meta:"


class TokenIssuer:
    """Shared JWT access/refresh issuance, rotation, and revocation logic
    for both admin and customer auth flows (composition, not inheritance,
    so each *AuthService stays free to have its own unrelated methods).

    Every refresh token's jti is tracked two ways in Redis: an individual
    TTL'd key (so a single logout/rotation can revoke just that session)
    and membership in a per-subject set (so a password change/reset can
    revoke every active session for that user at once)."""

    def __init__(self, redis: Redis, actor: Actor) -> None:
        self.redis = redis
        self.actor = actor

    def _sessions_key(self, subject: str) -> str:
        return f"{_USER_SESSIONS_PREFIX}{self.actor}:{subject}"

    def _meta_key(self, jti: str) -> str:
        return f"{_SESSION_META_PREFIX}{self.actor}:{jti}"

    async def issue(
        self,
        subject: str,
        *,
        user_agent: str | None = None,
        ip_address: str | None = None,
    ) -> TokenResponse:
        access_token = create_access_token(subject, self.actor)
        refresh_token, jti = create_refresh_token(subject, self.actor)
        ttl = timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
        await self.redis.set(f"{_REFRESH_KEY_PREFIX}{jti}", subject, ex=ttl)
        # redis-py's sync/async stub overloads resolve to a Union here, confusing mypy.
        await self.redis.sadd(self._sessions_key(subject), jti)  # type: ignore[misc]
        await self.redis.hset(  # type: ignore[misc]
            self._meta_key(jti),
            mapping={
                "created_at": datetime.now(UTC).isoformat(),
                "user_agent": user_agent or "",
                "ip_address": ip_address or "",
            },
        )
        await self.redis.expire(self._meta_key(jti), ttl)
        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        )

    async def list_sessions(self, subject: str) -> list[dict[str, Any]]:
        """Active sessions for `subject`, newest first — backs the admin
        panel's per-user Sessions view. Metadata (user agent/IP/created_at)
        is best-effort: sessions issued before this feature existed, or
        whose metadata key has independently expired, still show up (from
        the jti set) with blank metadata rather than being hidden."""
        jtis = await self.redis.smembers(self._sessions_key(subject))  # type: ignore[misc]
        sessions = []
        for jti in jtis:
            meta = await self.redis.hgetall(self._meta_key(jti))  # type: ignore[misc]
            sessions.append(
                {
                    "jti": jti,
                    "created_at": meta.get("created_at"),
                    "user_agent": meta.get("user_agent") or None,
                    "ip_address": meta.get("ip_address") or None,
                }
            )
        sessions.sort(key=lambda s: s["created_at"] or "", reverse=True)
        return sessions

    async def revoke_jti(self, subject: str, jti: str) -> bool:
        """Revokes one specific session by jti — used when an admin ends a
        single device's session rather than every session at once
        (`revoke_all`). Returns False if `jti` doesn't belong to
        `subject` (caller should treat that as a 404, not a silent no-op)."""
        is_member = await self.redis.sismember(self._sessions_key(subject), jti)  # type: ignore[misc]
        if not is_member:
            return False
        await self.redis.delete(f"{_REFRESH_KEY_PREFIX}{jti}", self._meta_key(jti))
        await self.redis.srem(self._sessions_key(subject), jti)  # type: ignore[misc]
        return True

    async def rotate(self, refresh_token: str) -> tuple[str, TokenResponse]:
        """Validates + revokes the presented refresh token and issues a
        fresh pair. Returns (subject, new_tokens)."""
        try:
            payload = decode_token(refresh_token)
        except JWTError:
            raise UnauthorizedError(key="errors.token_expired_or_invalid") from None

        if payload.get("type") != "refresh" or payload.get("actor") != self.actor:
            raise UnauthorizedError(key="errors.invalid_token_type")

        jti = payload.get("jti")
        subject = payload.get("sub")
        if not jti or not subject:
            raise UnauthorizedError(key="errors.invalid_token")

        stored_subject = await self.redis.get(f"{_REFRESH_KEY_PREFIX}{jti}")
        if stored_subject is None or stored_subject != subject:
            raise UnauthorizedError(key="errors.token_revoked")

        await self.redis.delete(f"{_REFRESH_KEY_PREFIX}{jti}")
        await self.redis.srem(self._sessions_key(subject), jti)  # type: ignore[misc]
        return subject, await self.issue(subject)

    async def revoke(self, refresh_token: str | None) -> None:
        if not refresh_token:
            return
        try:
            payload = decode_token(refresh_token)
        except JWTError:
            return
        jti = payload.get("jti")
        subject = payload.get("sub")
        if jti:
            await self.redis.delete(f"{_REFRESH_KEY_PREFIX}{jti}", self._meta_key(jti))
        if jti and subject:
            await self.redis.srem(self._sessions_key(subject), jti)  # type: ignore[misc]

    async def revoke_all(self, subject: str) -> None:
        """Revokes every active session for this subject. Used after a
        password change/reset so old sessions can't outlive a
        credential the user just invalidated."""
        session_key = self._sessions_key(subject)
        jtis = await self.redis.smembers(session_key)  # type: ignore[misc]
        if jtis:
            keys = [f"{_REFRESH_KEY_PREFIX}{jti}" for jti in jtis]
            keys += [self._meta_key(jti) for jti in jtis]
            await self.redis.delete(*keys)
        await self.redis.delete(session_key)
