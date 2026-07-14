from redis.asyncio import Redis

from app.core.i18n import DEFAULT_LOCALE, SUPPORTED_LOCALES

_KEY_PREFIX = "bot:lang:"


async def get_user_language(
    redis: Redis, telegram_id: int, telegram_language_code: str | None = None
) -> str:
    """Looks up a stored preference first; for a first-time user, tries to
    map their Telegram client language before falling back to
    DEFAULT_LOCALE. This Redis-backed cache covers any Telegram user (even
    one who has never gone through the customer-auth Telegram login flow),
    so it can't be replaced by Customer.language outright — but
    handlers/language.py's explicit `/language` selection does write
    through to that DB column too, since order/manager notifications are
    rendered server-side from it."""
    stored = await redis.get(f"{_KEY_PREFIX}{telegram_id}")
    if stored and stored in SUPPORTED_LOCALES:
        return stored

    if telegram_language_code:
        primary = telegram_language_code.split("-")[0].lower()
        if primary in SUPPORTED_LOCALES:
            return primary

    return DEFAULT_LOCALE


async def set_user_language(redis: Redis, telegram_id: int, locale: str) -> None:
    await redis.set(f"{_KEY_PREFIX}{telegram_id}", locale)
