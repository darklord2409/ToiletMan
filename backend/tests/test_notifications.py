import uuid
from collections.abc import AsyncGenerator
from decimal import Decimal

import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.commerce.order import Order
from app.models.enums import OrderStatus
from app.models.users.customer import Customer
from app.services.notifications import DEFAULT_TEMPLATES, NotificationService, resolve_template
from app.services.telegram_notifier import TelegramNotifier


def _auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


async def _login(client: AsyncClient, credentials: tuple[str, str]) -> str:
    username, password = credentials
    response = await client.post(
        "/api/v1/auth/login", data={"username": username, "password": password}
    )
    assert response.status_code == 200
    return response.json()["access_token"]


class _RecordingNotifier(TelegramNotifier):
    """Records what would have been sent instead of calling Telegram —
    used only for the pure trigger-selection tests below, which have
    nothing to do with real delivery. The OrderService/checkout
    integration tests further down deliberately use the real notifier
    (see TELEGRAM.md): they hit the real Telegram API with synthetic
    telegram_ids, which cleanly fails ("chat not found") and must never
    raise."""

    def __init__(self) -> None:
        super().__init__(bot_token="fake-token-for-tests")
        self.sent: list[tuple[int, str]] = []

    async def send_message(self, chat_id: int, text: str) -> bool:
        self.sent.append((chat_id, text))
        return True


@pytest_asyncio.fixture
async def notif_customer(db_session: AsyncSession) -> AsyncGenerator[Customer]:
    suffix = uuid.uuid4().hex[:8]
    customer = Customer(
        telegram_id=int(suffix, 16) % 1_000_000_000,
        first_name="Notify",
        last_name="Tester",
        phone=f"+99890{suffix[:7]}",
        is_active=True,
    )
    db_session.add(customer)
    await db_session.commit()

    yield customer

    db_obj = await db_session.get(Customer, customer.id)
    if db_obj:
        try:
            await db_session.delete(db_obj)
            await db_session.commit()
        except IntegrityError:
            await db_session.rollback()


@pytest_asyncio.fixture
async def notif_order(
    db_session: AsyncSession, notif_customer: Customer
) -> AsyncGenerator[Order]:
    suffix = uuid.uuid4().hex[:8]
    order = Order(
        customer_id=notif_customer.id,
        order_number=f"ORD-TEST-{suffix}",
        status=OrderStatus.PENDING,
        grand_total=Decimal("10.00"),
    )
    db_session.add(order)
    await db_session.commit()

    yield order

    db_obj = await db_session.get(Order, order.id)
    if db_obj:
        await db_session.delete(db_obj)
        await db_session.commit()


# ---------------------------------------------------------------------
# Template resolution: pure function, no DB/Telegram involved at all —
# see resolve_template's docstring for why this is split out of
# NotificationService (the StoreSettings singleton is shared with the
# real running app, so it's deliberately never mutated by tests).
# ---------------------------------------------------------------------


def test_resolve_template_falls_back_to_default() -> None:
    text = resolve_template("order_confirmed", "ru", overrides=None)
    assert text == DEFAULT_TEMPLATES["order_confirmed"]["ru"]


def test_resolve_template_prefers_admin_override() -> None:
    overrides = {"order_confirmed": {"ru": "Custom: {order_number}"}}
    text = resolve_template("order_confirmed", "ru", overrides=overrides)
    assert text == "Custom: {order_number}"


def test_resolve_template_falls_back_to_default_locale_when_locale_missing() -> None:
    text = resolve_template("order_confirmed", "fr", overrides=None)
    assert text == DEFAULT_TEMPLATES["order_confirmed"]["ru"]


def test_resolve_template_unknown_event_returns_event_key() -> None:
    assert resolve_template("nonexistent_event", "ru", overrides=None) == "nonexistent_event"


# ---------------------------------------------------------------------
# Trigger-selection logic (which events fire, notification-preference
# guard) — exercised with a recording notifier so no real delivery or
# StoreSettings access happens.
# ---------------------------------------------------------------------


async def test_notify_respects_notifications_disabled(db_session: AsyncSession) -> None:
    customer = Customer(telegram_id=123456789, notifications_enabled=False)
    order = Order(
        customer_id=uuid.uuid4(), order_number="ORD-DISABLED", status=OrderStatus.CONFIRMED
    )
    notifier = _RecordingNotifier()
    service = NotificationService(db_session, notifier)
    sent = await service.notify_order_status_changed(customer, order, OrderStatus.CONFIRMED)
    assert sent is False
    assert notifier.sent == []


async def test_notify_skips_unmapped_status(db_session: AsyncSession) -> None:
    customer = Customer(telegram_id=123456789, notifications_enabled=True)
    order = Order(customer_id=uuid.uuid4(), order_number="ORD-PENDING", status=OrderStatus.PENDING)
    notifier = _RecordingNotifier()
    service = NotificationService(db_session, notifier)
    # PENDING has no template mapping (it's the checkout-time default, not
    # something an admin transitions *to* — see STATUS_TEMPLATE_KEYS).
    sent = await service.notify_order_status_changed(customer, order, OrderStatus.PENDING)
    assert sent is False
    assert notifier.sent == []


async def test_notify_manager_contacted_requires_notes(db_session: AsyncSession) -> None:
    customer = Customer(telegram_id=123456789, notifications_enabled=True)
    order = Order(customer_id=uuid.uuid4(), order_number="ORD-NO-NOTES", manager_notes=None)
    notifier = _RecordingNotifier()
    service = NotificationService(db_session, notifier)
    sent = await service.notify_manager_contacted(customer, order)
    assert sent is False
    assert notifier.sent == []


# ---------------------------------------------------------------------
# Real trigger wiring: goes through the actual admin PATCH /orders/{id}
# endpoint, using the real TelegramNotifier against a synthetic
# telegram_id — Telegram cleanly rejects it ("chat not found"), which
# must be swallowed rather than failing the request.
# ---------------------------------------------------------------------


async def test_order_status_change_triggers_notification_without_raising(
    client: AsyncClient, admin_credentials: tuple[str, str], notif_order: Order
) -> None:
    token = await _login(client, admin_credentials)
    response = await client.patch(
        f"/api/v1/orders/{notif_order.id}",
        json={"status": "confirmed"},
        headers=_auth(token),
    )
    assert response.status_code == 200, response.text
    assert response.json()["status"] == "confirmed"


async def test_order_manager_notes_change_triggers_notification_without_raising(
    client: AsyncClient, admin_credentials: tuple[str, str], notif_order: Order
) -> None:
    token = await _login(client, admin_credentials)
    note = "Called the customer, confirmed the delivery address."
    response = await client.patch(
        f"/api/v1/orders/{notif_order.id}",
        json={"manager_notes": note},
        headers=_auth(token),
    )
    assert response.status_code == 200, response.text
    assert response.json()["manager_notes"] == note
