import uuid
from datetime import UTC, datetime
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.i18n import translate
from app.exceptions.base import BadRequestError, NotFoundError
from app.models.commerce.cart import Cart
from app.models.commerce.order import Order
from app.models.enums import CartStatus, OrderStatus, PaymentMethod
from app.repositories.catalog.product import ProductRepository
from app.repositories.commerce.cart import CartRepository
from app.repositories.commerce.cart_item import CartItemRepository
from app.repositories.commerce.order import OrderRepository
from app.repositories.commerce.order_item import OrderItemRepository
from app.repositories.users.customer import CustomerRepository
from app.schemas.commerce.order import OrderRead
from app.schemas.commerce.order_item import OrderItemRead
from app.schemas.storefront.checkout import CheckoutRequest, OrderDetailResponse
from app.services.notifications import NotificationService


class StorefrontCheckoutService:
    """Converts a customer's active cart into a pending, cash/manual order
    — the checkout flow the generic admin `Order`/`OrderItem` CRUD never
    implemented (no order-number generation, no totals from line items, no
    cart-to-order conversion existed before this Mini App)."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.cart_repo = CartRepository(session)
        self.cart_item_repo = CartItemRepository(session)
        self.order_repo = OrderRepository(session)
        self.order_item_repo = OrderItemRepository(session)
        self.product_repo = ProductRepository(session)
        self.customer_repo = CustomerRepository(session)
        self.notifications = NotificationService(session)

    async def _get_active_cart_with_items(self, customer_id: uuid.UUID):
        result = await self.session.execute(
            select(Cart).where(
                Cart.customer_id == customer_id,
                Cart.status == CartStatus.ACTIVE,
                Cart.deleted_at.is_(None),
            )
        )
        cart = result.scalar_one_or_none()
        if cart is None:
            raise BadRequestError(key="errors.cart_empty")
        items, _ = await self.cart_item_repo.list_all(filters={"cart_id": cart.id}, limit=500)
        if not items:
            raise BadRequestError(key="errors.cart_empty")
        return cart, items

    @staticmethod
    def _generate_order_number() -> str:
        return f"ORD-{datetime.now(UTC):%Y%m%d}-{uuid.uuid4().hex[:6].upper()}"

    async def checkout(
        self, customer_id: uuid.UUID, payload: CheckoutRequest
    ) -> OrderDetailResponse:
        cart, items = await self._get_active_cart_with_items(customer_id)

        subtotal = Decimal("0")
        line_data = []
        for item in items:
            product = await self.product_repo.get(item.product_id)
            line_total = item.unit_price * item.quantity
            subtotal += line_total
            line_data.append(
                {
                    "product_id": item.product_id,
                    "product_name": product.name if product else item.product_id.hex,
                    "sku": product.sku if product else "",
                    "unit_price": item.unit_price,
                    "quantity": item.quantity,
                    "line_total": line_total,
                }
            )

        order = await self.order_repo.create(
            {
                "customer_id": customer_id,
                "order_number": self._generate_order_number(),
                "status": OrderStatus.PENDING,
                "subtotal": subtotal,
                "grand_total": subtotal,
                "currency": "UZS",
                "delivery_method": payload.delivery_method,
                "payment_method": PaymentMethod.CASH,
                "contact_name": payload.contact_name,
                "contact_phone": payload.contact_phone,
                "shipping_address": {"address": payload.address} if payload.address else None,
                "notes": payload.comment,
            }
        )

        created_items = [
            await self.order_item_repo.create({**data, "order_id": order.id}) for data in line_data
        ]

        for item in items:
            await self.cart_item_repo.soft_delete(item)
        await self.cart_repo.update(cart, {"status": CartStatus.CONVERTED})

        customer = await self.customer_repo.get(customer_id)
        if customer is not None:
            product_lines = [f"{data['product_name']} × {data['quantity']}" for data in line_data]
            await self.notifications.notify_managers_new_order(order, customer, product_lines)

        return OrderDetailResponse(
            **OrderRead.model_validate(order).model_dump(),
            items=[OrderItemRead.model_validate(i) for i in created_items],
        )

    async def list_my_orders(
        self, customer_id: uuid.UUID, *, offset: int, limit: int
    ) -> tuple[list[Order], int]:
        return await self.order_repo.list_all(
            filters={"customer_id": customer_id},
            offset=offset,
            limit=limit,
            sort_by="created_at",
            sort_order="desc",
        )

    async def get_my_order(
        self, customer_id: uuid.UUID, order_id: uuid.UUID
    ) -> OrderDetailResponse:
        order = await self.order_repo.get(order_id)
        if order is None or order.customer_id != customer_id:
            raise NotFoundError(
                key="errors.not_found", params={"entity": translate("resource.orders")}
            )
        items, _ = await self.order_item_repo.list_all(filters={"order_id": order.id}, limit=500)
        return OrderDetailResponse(
            **OrderRead.model_validate(order).model_dump(),
            items=[OrderItemRead.model_validate(i) for i in items],
        )
