from typing import Any

from aiogram import Router
from aiogram.filters import Command
from aiogram.types import CallbackQuery, Message
from redis.asyncio import Redis

from app.core.i18n import SUPPORTED_LOCALES, translate
from app.keyboards.language import LANGUAGE_CALLBACK_PREFIX, language_keyboard
from app.keyboards.main_menu import main_menu_keyboard
from app.services import backend_client
from app.services.customer_session import get_customer_access_token
from app.services.language import set_user_language

router = Router(name="language")


@router.message(Command("language"))
async def cmd_language(message: Message, t: Any) -> None:
    await message.answer(t("language.choose"), reply_markup=language_keyboard())


@router.callback_query(lambda c: c.data is not None and c.data.startswith(LANGUAGE_CALLBACK_PREFIX))
async def on_language_selected(callback: CallbackQuery, redis: Redis) -> None:
    code = callback.data.removeprefix(LANGUAGE_CALLBACK_PREFIX) if callback.data else ""
    if code not in SUPPORTED_LOCALES or callback.from_user is None:
        await callback.answer()
        return

    await set_user_language(redis, callback.from_user.id, code)
    # Keep the backend's Customer.language in sync too — order/manager
    # notifications are rendered server-side using that field, not this
    # bot-local Redis cache, so without this a customer could pick English
    # here and still get Russian notifications.
    token = await get_customer_access_token(redis, callback.from_user)
    if token:
        await backend_client.update_language(token, code)

    if isinstance(callback.message, Message):
        await callback.message.edit_text(translate("language.changed", code))
        # The persistent bottom keyboard is static per-message — Telegram
        # never retranslates an already-sent ReplyKeyboardMarkup, so without
        # resending it here the menu buttons stay in the old language until
        # the user's next /start. A fresh message is the only way to swap it.
        await callback.message.answer(
            translate("language.changed", code), reply_markup=main_menu_keyboard(code)
        )
    await callback.answer()
