from collections.abc import AsyncGenerator

import pytest_asyncio
from redis.asyncio import Redis

from app.core.config import settings


@pytest_asyncio.fixture
async def redis_client() -> AsyncGenerator[Redis]:
    redis = Redis.from_url(settings.REDIS_URL, decode_responses=True)
    yield redis
    await redis.aclose()
