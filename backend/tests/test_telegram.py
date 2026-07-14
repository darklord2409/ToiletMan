import hashlib
import hmac
import json
import time
import uuid
from collections.abc import AsyncGenerator
from urllib.parse import urlencode

import pytest
import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.telegram import verify_init_data
from app.exceptions.base import UnauthorizedError
from app.models.users.customer import Customer

BOT_TOKEN = "test-bot-token-for-unit-tests"


def _sign(data: dict[str, str], bot_token: str = BOT_TOKEN) -> str:
    check_string = "\n".join(f"{k}={v}" for k, v in sorted(data.items()))
    secret_key = hmac.new(b"WebAppData", bot_token.encode(), hashlib.sha256).digest()
    return hmac.new(secret_key, check_string.encode(), hashlib.sha256).hexdigest()


def _build_init_data(
    user_id: int = 123456,
    bot_token: str = BOT_TOKEN,
    auth_date: int | None = None,
    username: str | None = None,
) -> str:
    user: dict[str, object] = {"id": user_id, "first_name": "Test"}
    if username is not None:
        user["username"] = username
    data = {
        "auth_date": str(auth_date or int(time.time())),
        "user": json.dumps(user),
    }
    data["hash"] = _sign(data, bot_token)
    return urlencode(data)


def test_verify_init_data_accepts_valid_signature() -> None:
    init_data = _build_init_data(user_id=42)
    result = verify_init_data(init_data, BOT_TOKEN)
    assert result["user"]["id"] == 42


def test_verify_init_data_rejects_tampered_hash() -> None:
    init_data = _build_init_data()
    tampered = init_data.replace(init_data.split("hash=")[1], "0" * 64)
    with pytest.raises(UnauthorizedError):
        verify_init_data(tampered, BOT_TOKEN)


def test_verify_init_data_rejects_wrong_bot_token() -> None:
    init_data = _build_init_data(bot_token="a-different-bot-token")
    with pytest.raises(UnauthorizedError):
        verify_init_data(init_data, BOT_TOKEN)


def test_verify_init_data_rejects_stale_auth_date() -> None:
    stale = int(time.time()) - 999_999
    init_data = _build_init_data(auth_date=stale)
    with pytest.raises(UnauthorizedError):
        verify_init_data(init_data, BOT_TOKEN)


def test_verify_init_data_rejects_missing_hash() -> None:
    with pytest.raises(UnauthorizedError):
        verify_init_data("auth_date=123&user=%7B%7D", BOT_TOKEN)


@pytest_asyncio.fixture
async def telegram_customer_id(db_session: AsyncSession) -> AsyncGenerator[int]:
    """A telegram_id guaranteed unused by any existing Customer row, so the
    login-with-telegram tests below can freely register/re-login without
    colliding with real or other tests' data."""
    telegram_id = int(uuid.uuid4().hex[:8], 16) % 1_000_000_000

    yield telegram_id

    result = await db_session.execute(
        Customer.__table__.select().where(Customer.telegram_id == telegram_id)
    )
    row = result.first()
    if row:
        db_obj = await db_session.get(Customer, row.id)
        if db_obj:
            await db_session.delete(db_obj)
            await db_session.commit()


async def test_telegram_login_captures_username_on_registration(
    client: AsyncClient, telegram_customer_id: int
) -> None:
    init_data = _build_init_data(
        user_id=telegram_customer_id, bot_token=settings.BOT_TOKEN, username="first_username"
    )
    response = await client.post("/api/v1/customer-auth/telegram", json={"init_data": init_data})
    assert response.status_code == 200
    token = response.json()["access_token"]

    me = await client.get(
        "/api/v1/customer-auth/me", headers={"Authorization": f"Bearer {token}"}
    )
    assert me.status_code == 200
    assert me.json()["telegram_username"] == "first_username"


async def test_telegram_login_refreshes_username_on_subsequent_login(
    client: AsyncClient, telegram_customer_id: int
) -> None:
    first_login = _build_init_data(
        user_id=telegram_customer_id, bot_token=settings.BOT_TOKEN, username="old_username"
    )
    await client.post("/api/v1/customer-auth/telegram", json={"init_data": first_login})

    second_login = _build_init_data(
        user_id=telegram_customer_id, bot_token=settings.BOT_TOKEN, username="new_username"
    )
    response = await client.post(
        "/api/v1/customer-auth/telegram", json={"init_data": second_login}
    )
    assert response.status_code == 200
    token = response.json()["access_token"]

    me = await client.get(
        "/api/v1/customer-auth/me", headers={"Authorization": f"Bearer {token}"}
    )
    assert me.json()["telegram_username"] == "new_username"
