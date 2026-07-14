from httpx import AsyncClient

from app.core.config import settings


async def test_login_is_rate_limited_after_threshold(client: AsyncClient) -> None:
    limit = settings.RATE_LIMIT_LOGIN_PER_MINUTE
    statuses = []
    for _ in range(limit + 2):
        response = await client.post(
            "/api/v1/auth/login", data={"username": "nobody", "password": "wrong"}
        )
        statuses.append(response.status_code)

    assert statuses[:limit] == [401] * limit
    assert statuses[limit:] == [429] * (len(statuses) - limit)
