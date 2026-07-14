from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.i18n import DEFAULT_LOCALE
from app.models.commerce.order import Order
from app.models.enums import OrderStatus
from app.models.users.customer import Customer
from app.repositories.content.store_settings import StoreSettingsRepository
from app.services.content.store_settings import StoreSettingsService
from app.services.telegram_notifier import TelegramNotifier

# Built-in fallback copy for every notification event — used whenever the
# admin hasn't (yet) overridden a key/locale in
# StoreSettings.notification_templates, so the feature works out of the
# box before any admin configuration. `{placeholder}` tokens are filled in
# with `str.format(**params)`, same convention as app.core.i18n.translate.
DEFAULT_TEMPLATES: dict[str, dict[str, str]] = {
    "order_confirmed": {
        "ru": "✅ Ваш заказ №{order_number} принят и подтверждён. Мы уже готовим его к выдаче.",
        "en": (
            "✅ Your order #{order_number} has been accepted and confirmed. "
            "We're preparing it now."
        ),
        "uz": "✅ №{order_number} buyurtmangiz qabul qilindi va tasdiqlandi.",
    },
    "order_processing": {
        "ru": "⚙️ Заказ №{order_number} в обработке.",
        "en": "⚙️ Order #{order_number} is being processed.",
        "uz": "⚙️ №{order_number} buyurtma qayta ishlanmoqda.",
    },
    "order_shipped": {
        "ru": "🚚 Заказ №{order_number} отправлен.",
        "en": "🚚 Order #{order_number} has been shipped.",
        "uz": "🚚 №{order_number} buyurtma jo'natildi.",
    },
    "order_delivered": {
        "ru": "📦 Заказ №{order_number} доставлен. Спасибо за покупку!",
        "en": "📦 Order #{order_number} has been delivered. Thank you for your purchase!",
        "uz": "📦 №{order_number} buyurtma yetkazildi. Xaridingiz uchun rahmat!",
    },
    "order_cancelled": {
        "ru": "❌ Заказ №{order_number} отменён.",
        "en": "❌ Order #{order_number} has been cancelled.",
        "uz": "❌ №{order_number} buyurtma bekor qilindi.",
    },
    "order_refunded": {
        "ru": "💸 По заказу №{order_number} оформлен возврат.",
        "en": "💸 Order #{order_number} has been refunded.",
        "uz": "💸 №{order_number} buyurtma bo'yicha pul qaytarildi.",
    },
    "manager_contacted": {
        "ru": "💬 Менеджер оставил комментарий по заказу №{order_number}:\n{manager_notes}",
        "en": "💬 A manager left a note on order #{order_number}:\n{manager_notes}",
        "uz": "💬 №{order_number} buyurtma bo'yicha menejer izohi:\n{manager_notes}",
    },
    "new_order_manager_alert": {
        "ru": (
            "🆕 Новый заказ №{order_number}\n"
            "Клиент: {customer_name}\n"
            "Телефон: {phone}\n"
            "Товары:\n{products}\n"
            "Сумма: {total} {currency}\n"
            "Доставка: {delivery}\n"
            "Комментарий: {comment}"
        ),
        "en": (
            "🆕 New order #{order_number}\n"
            "Customer: {customer_name}\n"
            "Phone: {phone}\n"
            "Products:\n{products}\n"
            "Total: {total} {currency}\n"
            "Delivery: {delivery}\n"
            "Comment: {comment}"
        ),
        "uz": (
            "🆕 Yangi buyurtma №{order_number}\n"
            "Mijoz: {customer_name}\n"
            "Telefon: {phone}\n"
            "Mahsulotlar:\n{products}\n"
            "Summa: {total} {currency}\n"
            "Yetkazib berish: {delivery}\n"
            "Izoh: {comment}"
        ),
    },
}

# Only these transitions notify the customer — PENDING is the checkout-time
# default (the Mini App's own success screen already covers "order
# received"), not something an admin ever transitions *to*.
STATUS_TEMPLATE_KEYS: dict[OrderStatus, str] = {
    OrderStatus.CONFIRMED: "order_confirmed",
    OrderStatus.PROCESSING: "order_processing",
    OrderStatus.SHIPPED: "order_shipped",
    OrderStatus.DELIVERED: "order_delivered",
    OrderStatus.CANCELLED: "order_cancelled",
    OrderStatus.REFUNDED: "order_refunded",
}


def resolve_template(
    event_key: str, locale: str, overrides: dict[str, dict[str, str]] | None
) -> str:
    """Pure lookup — admin override (event+locale) > admin override
    (event+default locale) > built-in default (event+locale) > built-in
    default (event+default locale) > the raw event key as a last resort.
    Split out from NotificationService so this fallback logic is testable
    without touching the StoreSettings singleton at all."""
    event_overrides = (overrides or {}).get(event_key, {})
    defaults = DEFAULT_TEMPLATES.get(event_key, {})
    return (
        event_overrides.get(locale)
        or defaults.get(locale)
        or event_overrides.get(DEFAULT_LOCALE)
        or defaults.get(DEFAULT_LOCALE)
        or event_key
    )


class NotificationService:
    """Renders + sends every Telegram notification this backend triggers
    (order status changes, manager notes, new-order manager alerts). See
    TELEGRAM.md for the full notification architecture."""

    def __init__(self, session: AsyncSession, notifier: TelegramNotifier | None = None) -> None:
        self.session = session
        self.notifier = notifier or TelegramNotifier()
        self.store_settings_service = StoreSettingsService(StoreSettingsRepository(session))

    async def _render(self, event_key: str, locale: str, **params: Any) -> str:
        store_settings = await self.store_settings_service.get_or_create()
        template = resolve_template(event_key, locale, store_settings.notification_templates)
        try:
            return template.format(**params)
        except (KeyError, IndexError):
            return template

    async def notify_order_status_changed(
        self, customer: Customer, order: Order, new_status: OrderStatus
    ) -> bool:
        if not customer.telegram_id or not customer.notifications_enabled:
            return False
        template_key = STATUS_TEMPLATE_KEYS.get(new_status)
        if template_key is None:
            return False
        text = await self._render(
            template_key, customer.language, order_number=order.order_number
        )
        return await self.notifier.send_message(customer.telegram_id, text)

    async def notify_manager_contacted(self, customer: Customer, order: Order) -> bool:
        if (
            not customer.telegram_id
            or not customer.notifications_enabled
            or not order.manager_notes
        ):
            return False
        text = await self._render(
            "manager_contacted",
            customer.language,
            order_number=order.order_number,
            manager_notes=order.manager_notes,
        )
        return await self.notifier.send_message(customer.telegram_id, text)

    async def notify_managers_new_order(
        self, order: Order, customer: Customer, product_lines: list[str]
    ) -> None:
        store_settings = await self.store_settings_service.get_or_create()
        manager_ids = store_settings.manager_telegram_ids or []
        if not manager_ids:
            return

        customer_name = " ".join(filter(None, [customer.first_name, customer.last_name])) or "—"
        text = await self._render(
            "new_order_manager_alert",
            store_settings.default_language,
            order_number=order.order_number,
            customer_name=customer_name,
            phone=order.contact_phone or customer.phone or "—",
            products="\n".join(product_lines) if product_lines else "—",
            total=str(order.grand_total),
            currency=order.currency,
            delivery=order.delivery_method.value if order.delivery_method else "—",
            comment=order.notes or "—",
        )
        for manager_id in manager_ids:
            await self.notifier.send_message(manager_id, text)
