from decimal import Decimal
from typing import Any

from pydantic import BaseModel

from app.schemas.base import TimestampedReadSchema


class StoreSettingsUpdate(BaseModel):
    store_name: str | None = None
    logo_url: str | None = None
    phone: str | None = None
    telegram_url: str | None = None
    whatsapp_url: str | None = None
    instagram_url: str | None = None
    address: str | None = None
    working_hours: dict[str, Any] | None = None
    delivery_info: str | None = None
    about_text: dict[str, str] | None = None
    currency: str | None = None
    default_language: str | None = None
    support_email: str | None = None
    support_phone: str | None = None
    tax_rate: Decimal | None = None
    tax_included: bool | None = None
    bot_name: str | None = None
    bot_username: str | None = None
    welcome_text: dict[str, str] | None = None
    welcome_image_url: str | None = None
    menu_button_text: dict[str, str] | None = None
    pinned_announcement: dict[str, str] | None = None
    manager_telegram_ids: list[int] | None = None
    notification_templates: dict[str, dict[str, str]] | None = None


class StoreSettingsRead(TimestampedReadSchema):
    store_name: str
    logo_url: str | None = None
    phone: str | None = None
    telegram_url: str | None = None
    whatsapp_url: str | None = None
    instagram_url: str | None = None
    address: str | None = None
    working_hours: dict[str, Any] | None = None
    delivery_info: str | None = None
    about_text: dict[str, str] | None = None
    currency: str
    default_language: str
    support_email: str | None = None
    support_phone: str | None = None
    tax_rate: Decimal
    tax_included: bool
    bot_name: str | None = None
    bot_username: str | None = None
    welcome_text: dict[str, str] | None = None
    welcome_image_url: str | None = None
    menu_button_text: dict[str, str] | None = None
    pinned_announcement: dict[str, str] | None = None
    manager_telegram_ids: list[int] | None = None
    notification_templates: dict[str, dict[str, str]] | None = None


class PublicStoreSettings(BaseModel):
    # Subset safe to expose unauthenticated to the storefront/Bot/Mini App.
    # Deliberately excludes tax_rate/tax_included/manager_telegram_ids/
    # notification_templates (internal-only).
    store_name: str
    logo_url: str | None = None
    phone: str | None = None
    telegram_url: str | None = None
    whatsapp_url: str | None = None
    instagram_url: str | None = None
    address: str | None = None
    working_hours: dict[str, Any] | None = None
    delivery_info: str | None = None
    about_text: dict[str, str] | None = None
    currency: str
    default_language: str
    support_email: str | None = None
    support_phone: str | None = None
    bot_name: str | None = None
    welcome_text: dict[str, str] | None = None
    welcome_image_url: str | None = None
    menu_button_text: dict[str, str] | None = None
    pinned_announcement: dict[str, str] | None = None

    model_config = {"from_attributes": True}
