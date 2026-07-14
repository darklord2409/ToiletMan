import json
from contextvars import ContextVar
from functools import lru_cache
from pathlib import Path
from typing import Any

SUPPORTED_LOCALES = ("ru", "en", "uz")
DEFAULT_LOCALE = "ru"

_LOCALES_DIR = Path(__file__).resolve().parent.parent / "locales"
_current_locale: ContextVar[str] = ContextVar("current_locale", default=DEFAULT_LOCALE)


@lru_cache
def _catalog(locale: str) -> dict[str, str]:
    path = _LOCALES_DIR / f"{locale}.json"
    if not path.exists():
        return {}
    return json.loads(path.read_text(encoding="utf-8"))


def get_locale() -> str:
    return _current_locale.get()


def set_locale(locale: str) -> None:
    _current_locale.set(locale if locale in SUPPORTED_LOCALES else DEFAULT_LOCALE)


def resolve_locale(accept_language: str | None) -> str:
    """Picks the best supported locale out of an Accept-Language header,
    e.g. "en-US,en;q=0.9,ru;q=0.8". Falls back to DEFAULT_LOCALE."""
    if not accept_language:
        return DEFAULT_LOCALE
    for part in accept_language.split(","):
        tag = part.split(";")[0].strip().lower()
        primary = tag.split("-")[0]
        if primary in SUPPORTED_LOCALES:
            return primary
    return DEFAULT_LOCALE


def translate(key: str, locale: str | None = None, **params: Any) -> str:
    active_locale = locale or get_locale()
    text = _catalog(active_locale).get(key) or _catalog(DEFAULT_LOCALE).get(key) or key
    if params:
        try:
            return text.format(**params)
        except (KeyError, IndexError):
            return text
    return text


def permission_display_name(code: str, locale: str | None = None) -> str:
    """Composes a human-readable label for a "resource.action" permission
    code (e.g. "products.read") from the small action/resource dictionaries
    instead of requiring one translation entry per permission."""
    if "." not in code:
        return code
    resource, _, action = code.rpartition(".")
    resource_label = translate(f"resource.{resource}", locale)
    action_label = translate(f"action.{action}", locale)
    if resource_label == f"resource.{resource}" or action_label == f"action.{action}":
        return code
    return f"{action_label} — {resource_label}"


def role_display_name(name: str, locale: str | None = None) -> str:
    label = translate(f"role.{name}", locale)
    return label if label != f"role.{name}" else name


def full_catalog(locale: str) -> dict[str, str]:
    merged = dict(_catalog(DEFAULT_LOCALE))
    merged.update(_catalog(locale))
    return merged
