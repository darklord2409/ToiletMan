import hashlib
import hmac
import json
import time
from urllib.parse import urlencode

from aiogram.types import User


def build_signed_init_data(bot_token: str, user: User) -> str:
    """Builds a validly-signed Telegram WebApp `initData` string for the
    *current* update's user, using the exact algorithm Telegram itself
    uses (https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app),
    reproduced backend-side at app/core/telegram.py::verify_init_data.

    The bot process already knows this update genuinely came from this
    Telegram user (that's what a valid long-poll/webhook connection with
    BOT_TOKEN guarantees) — signing a fresh initData payload with the same
    BOT_TOKEN the backend verifies against lets the bot reuse the
    *existing* `/customer-auth/telegram` login endpoint instead of the
    backend needing a second, bot-specific auth path.
    """
    user_payload = {
        key: value
        for key, value in {
            "id": user.id,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "username": user.username,
            "language_code": user.language_code,
        }.items()
        if value is not None
    }

    params = {
        "auth_date": str(int(time.time())),
        "user": json.dumps(user_payload, separators=(",", ":")),
    }
    data_check_string = "\n".join(f"{key}={value}" for key, value in sorted(params.items()))
    secret_key = hmac.new(b"WebAppData", bot_token.encode(), hashlib.sha256).digest()
    computed_hash = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()
    params["hash"] = computed_hash
    return urlencode(params)
