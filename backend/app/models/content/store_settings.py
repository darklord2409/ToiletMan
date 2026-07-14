from decimal import Decimal
from typing import Any

from sqlalchemy import Boolean, Numeric, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.mixins import Entity


class StoreSettings(Entity, Base):
    """Singleton table (enforced by StoreSettingsService, which always
    reads/creates the single row rather than a DB-level constraint) for
    store-identity configuration that must be editable at runtime by
    Content Managers/Admins — explicitly NOT sourced from .env."""

    __tablename__ = "store_settings"

    store_name: Mapped[str] = mapped_column(String(200), nullable=False, default="")
    logo_url: Mapped[str | None] = mapped_column(String(500))
    phone: Mapped[str | None] = mapped_column(String(32))
    telegram_url: Mapped[str | None] = mapped_column(String(500))
    whatsapp_url: Mapped[str | None] = mapped_column(String(500))
    instagram_url: Mapped[str | None] = mapped_column(String(500))
    address: Mapped[str | None] = mapped_column(Text)
    working_hours: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    delivery_info: Mapped[str | None] = mapped_column(Text)
    # Localized {"ru": "...", "en": "...", "uz": "..."}, same shape/rationale
    # as welcome_text below.
    about_text: Mapped[dict[str, str] | None] = mapped_column(JSONB)
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="UZS")
    default_language: Mapped[str] = mapped_column(String(5), nullable=False, default="ru")
    support_email: Mapped[str | None] = mapped_column(String(255))
    support_phone: Mapped[str | None] = mapped_column(String(32))
    tax_rate: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False, default=Decimal("0"))
    tax_included: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    # --- Telegram bot content (see TELEGRAM.md) ---
    bot_name: Mapped[str | None] = mapped_column(String(200))
    bot_username: Mapped[str | None] = mapped_column(String(200))
    # Localized {"ru": "...", "en": "...", "uz": "..."} — same shape as the
    # per-locale translation dicts already used across the catalog engine
    # (see e.g. ProductTranslation), just inlined as JSONB here rather than
    # a separate translation table since this is a handful of short strings
    # on a singleton row, not a per-entity table.
    welcome_text: Mapped[dict[str, str] | None] = mapped_column(JSONB)
    welcome_image_url: Mapped[str | None] = mapped_column(String(500))
    menu_button_text: Mapped[dict[str, str] | None] = mapped_column(JSONB)
    pinned_announcement: Mapped[dict[str, str] | None] = mapped_column(JSONB)
    # List of Telegram user IDs (int) who receive a notification on every
    # new order — see services/notifications.py. Plain JSONB list rather
    # than a join table: this is store-wide config, not a per-manager
    # entity with its own attributes.
    manager_telegram_ids: Mapped[list[int] | None] = mapped_column(JSONB)
    # {event_key: {locale: template}} — admin-editable overrides of the
    # built-in default templates in services/notifications.py::DEFAULT_TEMPLATES.
    # A key/locale missing here falls back to that default, so the feature
    # works out of the box before any admin customization.
    notification_templates: Mapped[dict[str, dict[str, str]] | None] = mapped_column(JSONB)
