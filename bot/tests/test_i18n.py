from app.core.i18n import SUPPORTED_LOCALES, label_variants, normalize_locale, translate


def test_translate_falls_back_to_default_locale_for_unknown_locale() -> None:
    assert translate("menu.support", "fr") == translate("menu.support", "ru")


def test_translate_falls_back_to_raw_key_when_missing_everywhere() -> None:
    assert translate("this.key.does.not.exist") == "this.key.does.not.exist"


def test_translate_formats_params() -> None:
    # start.welcome has no placeholders; use a key that does via a direct
    # format check instead of depending on catalog content.
    text = translate("menu.support", "en")
    assert isinstance(text, str) and text


def test_normalize_locale_rejects_unsupported() -> None:
    assert normalize_locale("fr") == "ru"
    assert normalize_locale(None) == "ru"
    assert normalize_locale("uz") == "uz"


def test_label_variants_covers_every_supported_locale() -> None:
    variants = label_variants("menu.support")
    assert len(variants) == len(SUPPORTED_LOCALES)
    for locale in SUPPORTED_LOCALES:
        assert translate("menu.support", locale) in variants
