import asyncio

from aiogram import Bot, Dispatcher
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode
from aiogram.fsm.storage.redis import RedisStorage
from aiogram.types import BotCommand, MenuButtonDefault, MenuButtonWebApp, WebAppInfo
from loguru import logger
from redis.asyncio import Redis

from app.core.config import settings
from app.core.i18n import SUPPORTED_LOCALES, translate
from app.core.logging import configure_logging
from app.handlers import router
from app.middlewares.i18n import I18nMiddleware
from app.services import backend_client


async def _set_localized_commands(bot: Bot) -> None:
    for locale in SUPPORTED_LOCALES:
        commands = [
            BotCommand(
                command="start", description=translate("start.command_description", locale)
            ),
            BotCommand(
                command="language", description=translate("language.command_description", locale)
            ),
        ]
        await bot.set_my_commands(commands, language_code=locale)


async def _set_default_menu_button(bot: Bot) -> None:
    """Global fallback for chats that never (re-)send /start — the /start
    handler itself refreshes this per-chat using the current admin-
    configured menu_button_text, so an admin edit doesn't require a bot
    restart to reach existing users."""
    if not settings.WEBAPP_URL:
        await bot.set_chat_menu_button(menu_button=MenuButtonDefault())
        return
    public_settings = await backend_client.get_public_settings()
    text = (public_settings.get("menu_button_text") or {}).get(
        "ru"
    ) or translate("menu.open_store", "ru")
    await bot.set_chat_menu_button(
        menu_button=MenuButtonWebApp(text=text[:16], web_app=WebAppInfo(url=settings.WEBAPP_URL))
    )


async def main() -> None:
    configure_logging()

    if not settings.BOT_TOKEN:
        logger.error("BOT_TOKEN is not set. Exiting.")
        return

    bot = Bot(
        token=settings.BOT_TOKEN,
        default=DefaultBotProperties(parse_mode=ParseMode.HTML),
    )
    storage = RedisStorage.from_url(settings.REDIS_URL)
    # Separate from aiogram's FSM storage connection: this one uses
    # decode_responses=True since it stores/reads plain language codes.
    redis_client = Redis.from_url(settings.REDIS_URL, decode_responses=True)

    dispatcher = Dispatcher(storage=storage)
    dispatcher.update.outer_middleware(I18nMiddleware(redis_client))
    dispatcher.include_router(router)

    await _set_localized_commands(bot)
    try:
        await _set_default_menu_button(bot)
    except Exception:
        # The backend may not be reachable yet at bot startup (compose
        # only waits for it to have *started*, not to be healthy) — the
        # /start handler refreshes this per-chat anyway, so a failure here
        # just means the very first /start after boot does slightly more
        # of the work, not that anything breaks.
        logger.warning("Could not set the default chat menu button at startup")

    logger.info("Starting bot polling in {} mode", settings.ENVIRONMENT)
    await bot.delete_webhook(drop_pending_updates=True)
    await dispatcher.start_polling(bot, redis=redis_client)


if __name__ == "__main__":
    asyncio.run(main())
