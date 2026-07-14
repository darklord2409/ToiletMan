from pydantic import BaseModel, EmailStr, field_validator

from app.core.i18n import SUPPORTED_LOCALES
from app.core.security import validate_password_strength
from app.exceptions.base import BadRequestError


class LanguagePreference(BaseModel):
    language: str

    @field_validator("language")
    @classmethod
    def _check_supported(cls, value: str) -> str:
        if value not in SUPPORTED_LOCALES:
            raise BadRequestError(key="errors.unsupported_language", params={"language": value})
        return value


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class AdminSessionRead(BaseModel):
    """One active refresh-token session for an admin user — backs the
    admin panel's per-user Sessions view (Users > Sessions)."""

    jti: str
    created_at: str | None = None
    user_agent: str | None = None
    ip_address: str | None = None


class RefreshRequest(BaseModel):
    refresh_token: str


class LogoutRequest(BaseModel):
    refresh_token: str | None = None


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def _check_strength(cls, value: str) -> str:
        validate_password_strength(value)
        return value


class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def _check_strength(cls, value: str) -> str:
        validate_password_strength(value)
        return value


class CustomerEmailLoginRequest(BaseModel):
    email: EmailStr
    password: str


class CustomerPhoneLoginRequest(BaseModel):
    # Architecture-ready even while phone login is disabled by default
    # (see settings.PHONE_LOGIN_ENABLED) — the storefront/bot can already
    # send this shape; the service just rejects it until enabled.

    phone: str
    password: str


class CustomerTelegramLoginRequest(BaseModel):
    init_data: str


class CustomerProfileUpdateRequest(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    phone: str | None = None
    notifications_enabled: bool | None = None


class CustomerRegisterRequest(BaseModel):
    email: EmailStr
    password: str
    first_name: str | None = None
    last_name: str | None = None

    @field_validator("password")
    @classmethod
    def _check_strength(cls, value: str) -> str:
        validate_password_strength(value)
        return value
