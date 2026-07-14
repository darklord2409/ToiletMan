from app.handlers.menu import _format_working_hours


def test_format_working_hours_none_returns_none() -> None:
    assert _format_working_hours(None, "ru") is None


def test_format_working_hours_empty_dict_returns_none() -> None:
    assert _format_working_hours({}, "ru") is None


def test_format_working_hours_formats_open_days() -> None:
    hours = {
        "monday": {"open": "09:00", "close": "18:00", "closed": False},
        "sunday": {"closed": True},
    }
    text = _format_working_hours(hours, "ru")
    assert text is not None
    assert "09:00–18:00" in text
    assert "Понедельник" in text
    assert "Воскресенье" in text
    assert "Выходной" in text


def test_format_working_hours_skips_days_without_data() -> None:
    hours = {"monday": {"open": "09:00", "close": "18:00", "closed": False}}
    text = _format_working_hours(hours, "en")
    assert text == "Monday: 09:00–18:00"
