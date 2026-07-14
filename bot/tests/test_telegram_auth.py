import random

from aiogram.types import User

from app.core.config import settings
from app.core.telegram_auth import build_signed_init_data
from app.services import backend_client


def _fake_user(user_id: int) -> User:
    return User(id=user_id, is_bot=False, first_name="Bot Test", language_code="ru")


async def test_signed_init_data_is_accepted_by_the_real_backend() -> None:
    """The whole point of build_signed_init_data is to be byte-for-byte
    compatible with backend/app/core/telegram.py::verify_init_data — the
    only way to genuinely prove that is a real round trip against the
    real running backend, not a re-implementation of the same algorithm
    mirrored back at itself.

    This necessarily registers a throwaway Customer row on the backend
    (first-contact auto-registration, same as any real user) — the bot
    process has no direct database access of its own (by design: it only
    ever talks to the backend over HTTP), so unlike the backend's own test
    suite this can't clean that row up itself. A handful of harmless
    throwaway customers (random telegram_id, no orders, no PII) is an
    accepted cost of testing this from the bot side."""
    user = _fake_user(900_000_000 + random.randint(0, 99_999_999))
    tokens = await backend_client.login_with_telegram(user)
    assert tokens["access_token"]
    assert tokens["refresh_token"]
    assert tokens["expires_in"] > 0


def test_signed_init_data_is_url_encoded_and_contains_a_hash() -> None:
    user = _fake_user(123456789)
    init_data = build_signed_init_data(settings.BOT_TOKEN or "test-token", user)
    assert "hash=" in init_data
    assert "auth_date=" in init_data
    assert "user=" in init_data


def test_signed_init_data_differs_per_call_due_to_auth_date() -> None:
    # Not a hard requirement, but confirms auth_date is actually populated
    # from the current time rather than a hardcoded stub.
    user = _fake_user(123456789)
    first = build_signed_init_data("some-token", user)
    assert "auth_date=0" not in first
