from contextlib import suppress
from typing import Any

from aiogram import Bot, Router
from aiogram.filters import CommandStart
from aiogram.types import (
    BufferedInputFile,
    MenuButtonDefault,
    MenuButtonWebApp,
    Message,
    WebAppInfo,
)
from redis.asyncio import Redis

from app.core.config import settings
from app.keyboards.main_menu import main_menu_keyboard
from app.services import backend_client
from app.services.customer_session import get_customer_access_token

router = Router(name="start")

# Telegram's chat menu button label has a short max length; truncate
# defensively rather than let an admin-entered long string get rejected.
_MENU_BUTTON_TEXT_MAX_LENGTH = 16


@router.message(CommandStart())
async def cmd_start(message: Message, t: Any, locale: str | None, redis: Redis, bot: Bot) -> None:
    user = message.from_user
    if user is None:
        return

    # Best-effort: registers/refreshes the Customer row and lets the
    # notification-preference toggle work later, but the shop button
    # itself needs no token at all (the Mini App does its own Telegram
    # initData handshake independently), so a backend hiccup here must
    # never block /start from responding.
    await get_customer_access_token(redis, user)

    public_settings = await backend_client.get_public_settings()
    welcome_text = (public_settings.get("welcome_text") or {}).get(locale) or t("start.welcome")
    welcome_image = public_settings.get("welcome_image_url")

    keyboard = main_menu_keyboard(locale or "ru")

    # welcome_image is an internal-network-only path (see fetch_media_bytes)
    # — Telegram's servers can't fetch it themselves, so the bytes must be
    # downloaded here and uploaded to Telegram directly.
    image_bytes = await backend_client.fetch_media_bytes(welcome_image) if welcome_image else None
    if image_bytes:
        photo = BufferedInputFile(image_bytes, filename="welcome.png")
        await message.answer_photo(
            photo, caption=welcome_text, reply_markup=keyboard, parse_mode=None
        )
    else:
        await message.answer(welcome_text, reply_markup=keyboard, parse_mode=None)

    # Per-chat refresh so a later admin edit to menu_button_text takes
    # effect without waiting for the bot process to restart (main.py sets
    # a global default at startup for chats that never /start again).
    menu_button_text = (public_settings.get("menu_button_text") or {}).get(locale) or t(
        "menu.open_store"
    )
    with suppress(Exception):
        menu_button: MenuButtonWebApp | MenuButtonDefault
        if settings.WEBAPP_URL:
            menu_button = MenuButtonWebApp(
                text=menu_button_text[:_MENU_BUTTON_TEXT_MAX_LENGTH],
                web_app=WebAppInfo(url=settings.WEBAPP_URL),
            )
        else:
            menu_button = MenuButtonDefault()
        await bot.set_chat_menu_button(chat_id=message.chat.id, menu_button=menu_button)

    pinned = (public_settings.get("pinned_announcement") or {}).get(locale)
    if pinned:
        sent = await message.answer(pinned, parse_mode=None)
        with suppress(Exception):
            await bot.pin_chat_message(message.chat.id, sent.message_id)
