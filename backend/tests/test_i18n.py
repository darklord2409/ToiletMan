from app.core.i18n import (
    permission_display_name,
    resolve_locale,
    role_display_name,
    set_locale,
    translate,
)


def test_translate_default_locale_is_russian() -> None:
    set_locale("ru")
    assert translate("errors.not_authenticated") == "Требуется аутентификация"


def test_translate_switches_locale() -> None:
    assert translate("errors.not_authenticated", locale="en") == "Authentication required"
    assert translate("errors.not_authenticated", locale="uz") == "Autentifikatsiya talab qilinadi"


def test_translate_interpolates_params() -> None:
    message = translate("errors.not_found", locale="en", entity="Product")
    assert message == "Product not found"


def test_translate_falls_back_to_key_when_missing() -> None:
    assert translate("nonexistent.key") == "nonexistent.key"


def test_resolve_locale_from_accept_language_header() -> None:
    assert resolve_locale("en-US,en;q=0.9,ru;q=0.8") == "en"
    assert resolve_locale("fr-FR,fr;q=0.9") == "ru"  # unsupported -> default
    assert resolve_locale(None) == "ru"


def test_permission_display_name_composes_from_action_and_resource() -> None:
    label = permission_display_name("products.read", locale="en")
    assert label == "View — Products"


def test_permission_display_name_falls_back_to_code_for_unknown_resource() -> None:
    assert permission_display_name("totally-unknown.read", locale="en") == "totally-unknown.read"


def test_role_display_name() -> None:
    assert role_display_name("sales_manager", locale="en") == "Sales Manager"
    assert role_display_name("unknown_role", locale="en") == "unknown_role"
