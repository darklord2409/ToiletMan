import pytest

from app.core.config import settings
from app.keyboards.main_menu import main_menu_keyboard


@pytest.fixture(autouse=True)
def _fake_webapp_url(monkeypatch: pytest.MonkeyPatch) -> None:
    # The real .env intentionally leaves WEBAPP_URL blank until a public
    # HTTPS tunnel/domain is deployed (Telegram rejects non-https web_app
    # URLs outright) — this only patches the setting inside this test
    # *process's* memory (a separate `docker compose exec` process from
    # the actually-running bot), never the real .env or the live bot.
    monkeypatch.setattr(settings, "WEBAPP_URL", "https://shop.example.com")


def test_main_menu_is_none_without_webapp_url(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "WEBAPP_URL", "")
    assert main_menu_keyboard("ru") is None


def test_main_menu_has_four_rows() -> None:
    keyboard = main_menu_keyboard("ru")
    assert keyboard is not None
    assert len(keyboard.keyboard) == 4


def test_open_store_button_launches_webapp_root() -> None:
    keyboard = main_menu_keyboard("ru")
    assert keyboard is not None
    open_store_button = keyboard.keyboard[0][0]
    assert open_store_button.web_app is not None
    assert open_store_button.web_app.url == "https://shop.example.com"


def test_my_requests_and_favorites_deep_link_into_specific_routes() -> None:
    keyboard = main_menu_keyboard("ru")
    assert keyboard is not None
    my_requests_button, favorites_button = keyboard.keyboard[1]
    assert my_requests_button.web_app.url == "https://shop.example.com/profile/orders"  # type: ignore[union-attr]
    assert favorites_button.web_app.url == "https://shop.example.com/favorites"  # type: ignore[union-attr]


def test_support_and_about_are_plain_text_buttons() -> None:
    keyboard = main_menu_keyboard("ru")
    assert keyboard is not None
    _promotions_button, support_button = keyboard.keyboard[2]
    settings_button, about_button = keyboard.keyboard[3]
    assert support_button.web_app is None
    assert settings_button.web_app is None
    assert about_button.web_app is None
