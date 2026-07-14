from aiogram.types import KeyboardButton, ReplyKeyboardMarkup, WebAppInfo

from app.core.config import settings
from app.core.i18n import translate


def _webapp_button(text: str, path: str = "") -> KeyboardButton:
    return KeyboardButton(text=text, web_app=WebAppInfo(url=f"{settings.WEBAPP_URL}{path}"))


def main_menu_keyboard(locale: str) -> ReplyKeyboardMarkup | None:
    """The persistent bottom keyboard. `None` when WEBAPP_URL isn't
    configured — Telegram rejects a web_app button with a non-https URL
    outright, so local dev without a public tunnel shows no menu at all
    rather than a broken one (mirrors the pre-existing shop_keyboard note).

    Four of the seven buttons launch the Mini App directly at a specific
    route (one tap, no bot-rendered list of anything shopping-related —
    see TELEGRAM.md); the other three ("Support"/"Settings"/"About Store")
    are plain text buttons matched by handlers/menu.py."""
    if not settings.WEBAPP_URL:
        return None
    return ReplyKeyboardMarkup(
        resize_keyboard=True,
        keyboard=[
            [_webapp_button(translate("menu.open_store", locale))],
            [
                _webapp_button(translate("menu.my_requests", locale), "/profile/orders"),
                _webapp_button(translate("menu.favorites", locale), "/favorites"),
            ],
            [
                _webapp_button(translate("menu.promotions", locale), "/"),
                KeyboardButton(text=translate("menu.support", locale)),
            ],
            [
                KeyboardButton(text=translate("menu.settings", locale)),
                KeyboardButton(text=translate("menu.about", locale)),
            ],
        ],
    )
