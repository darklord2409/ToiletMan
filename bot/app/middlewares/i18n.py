from collections.abc import Awaitable, Callable
from typing import Any

from aiogram import BaseMiddleware
from aiogram.types import TelegramObject, User
from redis.asyncio import Redis

from app.core.i18n import translate
from app.services.language import get_user_language


class I18nMiddleware(BaseMiddleware):
    """Resolves the current update's user language once per update and
    injects `locale` + a bound `t(key, **params)` translator into handler
    data, so no handler ever hardcodes a user-facing string."""

    def __init__(self, redis: Redis) -> None:
        self.redis = redis

    async def __call__(
        self,
        handler: Callable[[TelegramObject, dict[str, Any]], Awaitable[Any]],
        event: TelegramObject,
        data: dict[str, Any],
    ) -> Any:
        user: User | None = data.get("event_from_user")
        locale = (
            await get_user_language(self.redis, user.id, user.language_code)
            if user is not None
            else None
        )
        data["locale"] = locale
        data["t"] = lambda key, **params: translate(key, locale, **params)
        return await handler(event, data)
