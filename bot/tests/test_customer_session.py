import random

from aiogram.types import User
from redis.asyncio import Redis

from app.services.customer_session import _TOKEN_KEY_PREFIX, get_customer_access_token


def _fake_user(user_id: int) -> User:
    return User(id=user_id, is_bot=False, first_name="Session Test", language_code="ru")


async def test_get_customer_access_token_caches_in_redis(redis_client: Redis) -> None:
    user = _fake_user(900_100_000 + random.randint(0, 99_999))
    cache_key = f"{_TOKEN_KEY_PREFIX}{user.id}"
    await redis_client.delete(cache_key)

    try:
        first_token = await get_customer_access_token(redis_client, user)
        assert first_token

        cached_value = await redis_client.get(cache_key)
        assert cached_value == first_token

        # Second call must be a pure cache hit — no new backend call, same
        # token returned.
        second_token = await get_customer_access_token(redis_client, user)
        assert second_token == first_token
    finally:
        await redis_client.delete(cache_key)
