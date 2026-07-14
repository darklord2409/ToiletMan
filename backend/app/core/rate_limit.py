from collections.abc import Awaitable, Callable

from fastapi import Depends, Request
from redis.asyncio import Redis

from app.core.deps import get_redis
from app.exceptions.base import TooManyRequestsError

_PREFIX = "ratelimit:"


def rate_limit(key: str, limit: int, window_seconds: int) -> Callable[..., Awaitable[None]]:
    """Fixed-window rate limiter keyed by client IP, backed by Redis
    (already part of the stack, no extra dependency needed). Intended for
    brute-force-sensitive endpoints: login, refresh, password reset."""

    async def _dependency(request: Request, redis: Redis = Depends(get_redis)) -> None:
        client_ip = request.client.host if request.client else "unknown"
        redis_key = f"{_PREFIX}{key}:{client_ip}"

        current = await redis.incr(redis_key)
        if current == 1:
            await redis.expire(redis_key, window_seconds)

        if current > limit:
            ttl = await redis.ttl(redis_key)
            raise TooManyRequestsError(
                key="errors.rate_limited", params={"retry_after": max(ttl, 1)}
            )

    return _dependency
