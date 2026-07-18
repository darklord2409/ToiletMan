import uuid
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.exceptions.base import BadRequestError, NotFoundError
from app.models.commerce.cart import Cart
from app.models.commerce.cart_item import CartItem
from app.models.enums import AnalyticsEventType, CartStatus, ProductStatus
from app.repositories.catalog.product import ProductRepository
from app.repositories.catalog.product_analytics_event import ProductAnalyticsEventRepository
from app.repositories.catalog.product_image import ProductImageRepository
from app.repositories.commerce.cart import CartRepository
from app.repositories.commerce.cart_item import CartItemRepository
from app.schemas.storefront.cart import CartResponse
from app.services.commerce.discount_engine import DiscountEngine
from app.services.storefront._shared import build_product_summary


class StorefrontCartService:
    """The cart logic the generic admin `Cart`/`CartItem` CRUD routers never
    had: identifying "my" cart, snapshotting price on add, checking stock,
    and computing totals — none of that existed before this Mini App."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.cart_repo = CartRepository(session)
        self.cart_item_repo = CartItemRepository(session)
        self.product_repo = ProductRepository(session)
        self.image_repo = ProductImageRepository(session)
        self.analytics_event_repo = ProductAnalyticsEventRepository(session)
        self.discount_engine = DiscountEngine(session)

    async def _get_or_create_cart(self, customer_id: uuid.UUID) -> Cart:
        result = await self.session.execute(
            select(Cart).where(
                Cart.customer_id == customer_id,
                Cart.status == CartStatus.ACTIVE,
                Cart.deleted_at.is_(None),
            )
        )
        cart = result.scalar_one_or_none()
        if cart is not None:
            return cart
        return await self.cart_repo.create(
            {"customer_id": customer_id, "status": CartStatus.ACTIVE}
        )

    async def _require_own_item(self, customer_id: uuid.UUID, item_id: uuid.UUID) -> CartItem:
        cart = await self._get_or_create_cart(customer_id)
        item = await self.cart_item_repo.get(item_id)
        if item is None or item.cart_id != cart.id:
            raise NotFoundError(key="errors.not_found", params={"entity": "Cart item"})
        return item

    async def _to_response(self, cart: Cart) -> CartResponse:
        items, _ = await self.cart_item_repo.list_all(filters={"cart_id": cart.id}, limit=500)
        item_responses = []
        subtotal = Decimal("0")
        for item in items:
            product = await self.product_repo.get(item.product_id)
            if product is None:
                continue
            line_total = item.unit_price * item.quantity
            subtotal += line_total
            item_responses.append(
                {
                    "id": item.id,
                    "product_id": item.product_id,
                    "product": await build_product_summary(
                        self.image_repo, product, self.discount_engine
                    ),
                    "quantity": item.quantity,
                    "unit_price": item.unit_price,
                    "line_total": line_total,
                }
            )
        return CartResponse(
            id=cart.id,
            items=item_responses,
            item_count=sum(i.quantity for i in items),
            subtotal=subtotal,
        )

    async def get_cart(self, customer_id: uuid.UUID) -> CartResponse:
        cart = await self._get_or_create_cart(customer_id)
        return await self._to_response(cart)

    def _check_stock(self, product: object, requested_quantity: int) -> None:
        if product.is_unlimited_stock:  # type: ignore[attr-defined]
            return
        available = product.stock_quantity - product.reserved_quantity  # type: ignore[attr-defined]
        if requested_quantity > available:
            raise BadRequestError(key="errors.insufficient_stock")

    async def add_item(
        self, customer_id: uuid.UUID, product_id: uuid.UUID, quantity: int
    ) -> CartResponse:
        product = await self.product_repo.get(product_id)
        if product is None or product.status != ProductStatus.ACTIVE:
            raise BadRequestError(key="errors.product_not_available")
        await self.analytics_event_repo.log(
            product_id=product_id,
            event_type=AnalyticsEventType.ADD_TO_CART,
            customer_id=customer_id,
        )

        cart = await self._get_or_create_cart(customer_id)
        existing_items, _ = await self.cart_item_repo.list_all(
            filters={"cart_id": cart.id, "product_id": product_id}, limit=1
        )
        existing = existing_items[0] if existing_items else None
        new_quantity = (existing.quantity if existing else 0) + quantity
        self._check_stock(product, new_quantity)

        unit_price, _ = await self.discount_engine.effective_price(
            product_id=product.id, category_id=product.category_id, price=product.price
        )
        if existing:
            await self.cart_item_repo.update(
                existing, {"quantity": new_quantity, "unit_price": unit_price}
            )
        else:
            await self.cart_item_repo.create(
                {
                    "cart_id": cart.id,
                    "product_id": product_id,
                    "quantity": quantity,
                    "unit_price": unit_price,
                }
            )
        return await self._to_response(cart)

    async def update_item_quantity(
        self, customer_id: uuid.UUID, item_id: uuid.UUID, quantity: int
    ) -> CartResponse:
        item = await self._require_own_item(customer_id, item_id)
        product = await self.product_repo.get(item.product_id)
        if product is not None:
            self._check_stock(product, quantity)
        await self.cart_item_repo.update(item, {"quantity": quantity})
        cart = await self._get_or_create_cart(customer_id)
        return await self._to_response(cart)

    async def remove_item(self, customer_id: uuid.UUID, item_id: uuid.UUID) -> CartResponse:
        item = await self._require_own_item(customer_id, item_id)
        await self.cart_item_repo.soft_delete(item)
        cart = await self._get_or_create_cart(customer_id)
        return await self._to_response(cart)

    async def clear_cart(self, customer_id: uuid.UUID) -> CartResponse:
        cart = await self._get_or_create_cart(customer_id)
        items, _ = await self.cart_item_repo.list_all(filters={"cart_id": cart.id}, limit=500)
        for item in items:
            await self.cart_item_repo.soft_delete(item)
        return await self._to_response(cart)
