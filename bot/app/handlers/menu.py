import html
from contextlib import suppress
from typing import Any

from aiogram import Bot, F, Router
from aiogram.exceptions import TelegramBadRequest
from aiogram.types import BufferedInputFile, CallbackQuery, Message
from loguru import logger
from redis.asyncio import Redis

from app.core.i18n import label_variants, translate
from app.keyboards.settings import NOTIFICATIONS_TOGGLE_CALLBACK, settings_keyboard
from app.services import backend_client
from app.services.customer_session import get_customer_access_token

router = Router(name="menu")

_DAY_KEYS = (
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
)


def _format_working_hours(working_hours: dict[str, Any] | None, locale: str) -> str | None:
    if not working_hours:
        return None
    lines = []
    for day in _DAY_KEYS:
        day_data = working_hours.get(day)
        if not day_data:
            continue
        day_label = translate(f"days.{day}", locale)
        if day_data.get("closed"):
            lines.append(f"{day_label}: {translate('store.closed', locale)}")
        elif day_data.get("open") and day_data.get("close"):
            lines.append(f"{day_label}: {day_data['open']}–{day_data['close']}")
    return "\n".join(lines) if lines else None


@router.message(F.text.in_(label_variants("menu.support")))
async def on_support(message: Message, locale: str | None) -> None:
    public_settings = await backend_client.get_public_settings()
    lines = [translate("support.title", locale)]

    if public_settings.get("support_phone") or public_settings.get("phone"):
        phone = public_settings.get("support_phone") or public_settings.get("phone")
        lines.append(f"{translate('support.phone', locale)}: {phone}")
    if public_settings.get("telegram_url"):
        lines.append(f"{translate('support.telegram', locale)}: {public_settings['telegram_url']}")
    if public_settings.get("whatsapp_url"):
        lines.append(f"{translate('support.whatsapp', locale)}: {public_settings['whatsapp_url']}")
    if public_settings.get("support_email"):
        lines.append(f"{translate('support.email', locale)}: {public_settings['support_email']}")

    hours_text = _format_working_hours(public_settings.get("working_hours"), locale or "ru")
    if hours_text:
        lines.append(f"\n{translate('support.workingHours', locale)}:\n{hours_text}")

    if len(lines) == 1:
        lines.append(translate("support.notConfigured", locale))

    await message.answer("\n".join(lines), parse_mode=None)


async def _fetch_bot_avatar_bytes(bot: Bot) -> bytes | None:
    # "About the store" should show the bot's actual Telegram avatar (set via
    # setMyProfilePhoto), which is not the same image as StoreSettings.logo_url
    # (that's the horizontal wordmark used elsewhere in the Mini App) — read
    # it straight from Telegram rather than assuming any DB field mirrors it.
    try:
        photos = await bot.get_user_profile_photos(bot.id, limit=1)
        if not photos.photos:
            return None
        largest = photos.photos[0][-1]
        buffer = await bot.download(largest.file_id)
        return buffer.read() if buffer else None
    except Exception as exc:  # noqa: BLE001 - degrade to text-only, never break the handler
        logger.warning("Failed to fetch bot profile photo: {}", exc)
        return None


@router.message(F.text.in_(label_variants("menu.about")))
async def on_about_store(message: Message, locale: str | None, bot: Bot) -> None:
    public_settings = await backend_client.get_public_settings()
    # This one message gets a bold, decorated title (unlike every other
    # handler here, which deliberately uses parse_mode=None to sidestep
    # HTML-escaping admin-authored free text) — so every dynamic field
    # must be html.escape()'d individually before being joined in.
    title = html.escape(public_settings.get("store_name") or translate("about.title", locale))
    lines = [f"💧 <b>{title}</b>"]

    about_text = (public_settings.get("about_text") or {}).get(locale or "ru")
    if about_text:
        lines.append(html.escape(about_text))
    if public_settings.get("address"):
        address = html.escape(public_settings["address"])
        lines.append(f"{translate('about.address', locale)}: {address}")
    if public_settings.get("delivery_info"):
        delivery = html.escape(public_settings["delivery_info"])
        lines.append(f"{translate('about.delivery', locale)}: {delivery}")

    hours_text = _format_working_hours(public_settings.get("working_hours"), locale or "ru")
    if hours_text:
        lines.append(f"\n{translate('support.workingHours', locale)}:\n{html.escape(hours_text)}")

    text = "\n".join(lines)
    image_bytes = await _fetch_bot_avatar_bytes(bot)
    if not image_bytes:
        logo = public_settings.get("logo_url")
        image_bytes = await backend_client.fetch_media_bytes(logo) if logo else None
    if image_bytes:
        photo = BufferedInputFile(image_bytes, filename="logo.png")
        await message.answer_photo(photo, caption=text, parse_mode="HTML")
    else:
        await message.answer(text, parse_mode="HTML")


@router.message(F.text.in_(label_variants("menu.settings")))
async def on_settings(message: Message, locale: str | None, redis: Redis) -> None:
    user = message.from_user
    if user is None:
        return
    notifications_enabled = True
    token = await get_customer_access_token(redis, user)
    if token:
        profile = await backend_client.get_me(token)
        if profile is not None:
            notifications_enabled = bool(profile.get("notifications_enabled", True))

    await message.answer(
        translate("settings.title", locale),
        reply_markup=settings_keyboard(locale or "ru", notifications_enabled),
        parse_mode=None,
    )


@router.callback_query(F.data == NOTIFICATIONS_TOGGLE_CALLBACK)
async def on_toggle_notifications(
    callback: CallbackQuery, locale: str | None, redis: Redis
) -> None:
    user = callback.from_user
    token = await get_customer_access_token(redis, user)
    if not token:
        await callback.answer(translate("genericError", locale))
        return

    profile = await backend_client.get_me(token)
    current = bool(profile.get("notifications_enabled", True)) if profile else True
    updated = await backend_client.update_profile(token, notifications_enabled=not current)
    new_state = bool(updated.get("notifications_enabled", not current)) if updated else not current

    if isinstance(callback.message, Message):
        with suppress(TelegramBadRequest):
            await callback.message.edit_reply_markup(
                reply_markup=settings_keyboard(locale or "ru", new_state)
            )
    toggle_key = "settings.notifications_on" if new_state else "settings.notifications_off"
    await callback.answer(translate(toggle_key, locale))
