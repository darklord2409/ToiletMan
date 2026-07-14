from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup

from app.core.i18n import SUPPORTED_LOCALES

FLAGS = {"ru": "🇷🇺", "en": "🇬🇧", "uz": "🇺🇿"}
NAMES = {"ru": "Русский", "en": "English", "uz": "O'zbekcha"}

LANGUAGE_CALLBACK_PREFIX = "set_lang:"


def language_buttons() -> list[list[InlineKeyboardButton]]:
    return [
        [
            InlineKeyboardButton(
                text=f"{FLAGS[code]} {NAMES[code]}",
                callback_data=f"{LANGUAGE_CALLBACK_PREFIX}{code}",
            )
        ]
        for code in SUPPORTED_LOCALES
    ]


def language_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=language_buttons())
