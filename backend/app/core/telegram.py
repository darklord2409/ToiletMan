import hashlib
import hmac
import json
import time
from typing import Any
from urllib.parse import parse_qsl

from app.exceptions.base import UnauthorizedError

_INIT_DATA_MAX_AGE_SECONDS = 24 * 60 * 60


def verify_init_data(
    init_data: str, bot_token: str, max_age_seconds: int = _INIT_DATA_MAX_AGE_SECONDS
) -> dict[str, Any]:
    """Validates Telegram WebApp `initData` per the official algorithm:
    https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app

    secret_key = HMAC_SHA256("WebAppData", bot_token)
    check_hash = HMAC_SHA256(secret_key, data_check_string)

    Returns the parsed fields (including the decoded `user` object) on
    success, or raises UnauthorizedError (localized) on failure.
    """
    if not bot_token:
        raise UnauthorizedError(key="errors.telegram_init_data_invalid")

    pairs = dict(parse_qsl(init_data, strict_parsing=False))
    received_hash = pairs.pop("hash", None)
    if not received_hash:
        raise UnauthorizedError(key="errors.telegram_init_data_invalid")

    data_check_string = "\n".join(f"{key}={value}" for key, value in sorted(pairs.items()))

    secret_key = hmac.new(b"WebAppData", bot_token.encode(), hashlib.sha256).digest()
    computed_hash = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()

    if not hmac.compare_digest(computed_hash, received_hash):
        raise UnauthorizedError(key="errors.telegram_init_data_invalid")

    auth_date = pairs.get("auth_date")
    if auth_date and (time.time() - int(auth_date)) > max_age_seconds:
        raise UnauthorizedError(key="errors.telegram_init_data_invalid")

    result: dict[str, Any] = dict(pairs)
    if "user" in pairs:
        try:
            result["user"] = json.loads(pairs["user"])
        except json.JSONDecodeError:
            raise UnauthorizedError(key="errors.telegram_init_data_invalid") from None

    return result
