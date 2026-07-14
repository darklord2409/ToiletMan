from collections.abc import Sequence
from typing import Any

from app.core.i18n import get_locale, translate

# pydantic-core error `type` codes we know how to render a friendly,
# localized message for. `ctx` (when present) supplies the template
# parameters (e.g. {"min_length": 8} for "string_too_short"). Anything not
# listed here falls back to pydantic's own English `msg` untouched rather
# than showing a raw translation key.
_KNOWN_ERROR_TYPES = {
    "missing",
    "string_type",
    "int_type",
    "float_type",
    "bool_type",
    "dict_type",
    "list_type",
    "string_too_short",
    "string_too_long",
    "too_short",
    "too_long",
    "greater_than",
    "greater_than_equal",
    "less_than",
    "less_than_equal",
    "uuid_parsing",
    "uuid_type",
    "decimal_parsing",
    "json_invalid",
    "json_type",
    "date_parsing",
    "date_type",
    "datetime_parsing",
    "datetime_type",
    "enum",
    "literal_error",
    "extra_forbidden",
    "string_pattern_mismatch",
    "int_parsing",
    "float_parsing",
    "bool_parsing",
}


def _format_expected(ctx: dict[str, Any]) -> dict[str, Any]:
    """"enum"/"literal_error" errors carry ctx={"expected": "'a', 'b' or 'c'"}
    (pydantic pre-formats it as a string) — passed through as-is."""
    return ctx


def translate_pydantic_error(error: dict[str, Any], locale: str | None = None) -> str:
    """Translates a single error dict from RequestValidationError.errors()
    into the current (or given) locale. Falls back to pydantic's own
    English `msg` for any error type we don't have a template for, rather
    than surfacing a raw translation key."""
    error_type = error.get("type", "")
    original_msg = error.get("msg", "")

    if error_type == "value_error" and "valid email address" in original_msg:
        return translate("pydantic_error.email_invalid", locale)

    if error_type not in _KNOWN_ERROR_TYPES:
        return original_msg

    ctx = _format_expected(error.get("ctx", {}))
    translated = translate(f"pydantic_error.{error_type}", locale, **ctx)
    return translated


def translate_pydantic_errors(
    errors: Sequence[dict[str, Any]], locale: str | None = None
) -> list[dict[str, Any]]:
    active_locale = locale or get_locale()
    return [{**err, "msg": translate_pydantic_error(err, active_locale)} for err in errors]
