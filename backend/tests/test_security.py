import pytest

from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    validate_password_strength,
    verify_password,
)
from app.exceptions.base import BadRequestError


def test_hash_and_verify_roundtrip() -> None:
    hashed = hash_password("Sup3r$ecret")
    assert hashed != "Sup3r$ecret"
    assert verify_password("Sup3r$ecret", hashed) is True
    assert verify_password("wrong", hashed) is False


def test_hash_uses_argon2() -> None:
    assert hash_password("Sup3r$ecret").startswith("$argon2")


@pytest.mark.parametrize(
    "password",
    ["short1!", "nouppercase1!", "NOLOWERCASE1!", "NoDigitsHere!", "NoSpecialChar123"],
)
def test_validate_password_strength_rejects_weak_passwords(password: str) -> None:
    with pytest.raises(BadRequestError):
        validate_password_strength(password)


def test_validate_password_strength_accepts_strong_password() -> None:
    validate_password_strength("Str0ng!Passw0rd")  # should not raise


def test_access_token_roundtrip() -> None:
    token = create_access_token("user-123", "admin")
    payload = decode_token(token)
    assert payload["sub"] == "user-123"
    assert payload["actor"] == "admin"
    assert payload["type"] == "access"


def test_refresh_token_has_jti() -> None:
    token, jti = create_refresh_token("user-123", "customer")
    payload = decode_token(token)
    assert payload["jti"] == jti
    assert payload["type"] == "refresh"
    assert payload["actor"] == "customer"
