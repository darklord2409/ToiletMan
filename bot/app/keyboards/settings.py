from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup

from app.core.i18n import translate
from app.keyboards.language import language_buttons

NOTIFICATIONS_TOGGLE_CALLBACK = "toggle_notifications"


def settings_keyboard(locale: str, notifications_enabled: bool) -> InlineKeyboardMarkup:
    toggle_key = (
        "settings.notifications_on" if notifications_enabled else "settings.notifications_off"
    )
    return InlineKeyboardMarkup(
        inline_keyboard=[
            *language_buttons(),
            [
                InlineKeyboardButton(
                    text=translate(toggle_key, locale),
                    callback_data=NOTIFICATIONS_TOGGLE_CALLBACK,
                )
            ],
        ]
    )
