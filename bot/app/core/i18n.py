import json
from functools import lru_cache
from pathlib import Path
from typing import Any

SUPPORTED_LOCALES = ("ru", "en", "uz")
DEFAULT_LOCALE = "ru"

_LOCALES_DIR = Path(__file__).resolve().parent.parent / "locales"


@lru_cache
def _catalog(locale: str) -> dict[str, str]:
    path = _LOCALES_DIR / f"{locale}.json"
    if not path.exists():
        return {}
    return json.loads(path.read_text(encoding="utf-8"))


def normalize_locale(locale: str | None) -> str:
    if locale and locale in SUPPORTED_LOCALES:
        return locale
    return DEFAULT_LOCALE


def translate(key: str, locale: str | None = None, **params: Any) -> str:
    active = normalize_locale(locale)
    text = _catalog(active).get(key) or _catalog(DEFAULT_LOCALE).get(key) or key
    if params:
        try:
            return text.format(**params)
        except (KeyError, IndexError):
            return text
    return text


def label_variants(key: str) -> set[str]:
    """Every locale's rendering of a plain-text reply-keyboard button
    label — used to match an incoming message against a menu button
    regardless of which language it's currently showing in (unlike
    inline-keyboard buttons, a ReplyKeyboardMarkup button carries no
    locale-independent callback_data, just its visible text)."""
    return {translate(key, locale) for locale in SUPPORTED_LOCALES}
