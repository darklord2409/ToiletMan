import uuid
from datetime import UTC, datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.commerce.discount import Discount
from app.models.enums import AmountType, DiscountScope


class DiscountEngine:
    """Resolves the effective (possibly discounted) price for a product from
    active Discount campaigns. Precedence when several could apply: a
    product-specific discount beats a category-specific one, which beats a
    storewide (ALL scope) one; among equally-specific matches, whichever
    saves the customer the most wins. Loads every active discount once per
    instance (a small table) and caches it for the instance's lifetime, so
    resolving prices for a whole product list costs a single query, not one
    per product — construct one instance per request/service."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self._loaded = False
        self._all_scope: list[Discount] = []
        self._by_category: dict[uuid.UUID, list[Discount]] = {}
        self._by_product: dict[uuid.UUID, list[Discount]] = {}

    async def _ensure_loaded(self) -> None:
        if self._loaded:
            return
        now = datetime.now(UTC)
        result = await self.session.execute(
            select(Discount).where(Discount.deleted_at.is_(None), Discount.is_active.is_(True))
        )
        for discount in result.scalars():
            if discount.starts_at is not None and discount.starts_at > now:
                continue
            if discount.ends_at is not None and discount.ends_at < now:
                continue
            if discount.scope == DiscountScope.ALL:
                self._all_scope.append(discount)
            elif discount.scope == DiscountScope.CATEGORY and discount.category_id is not None:
                self._by_category.setdefault(discount.category_id, []).append(discount)
            elif discount.scope == DiscountScope.PRODUCT and discount.product_id is not None:
                self._by_product.setdefault(discount.product_id, []).append(discount)
        self._loaded = True

    @staticmethod
    def _amount_off(price: Decimal, discount: Discount) -> Decimal:
        if discount.amount_type == AmountType.PERCENTAGE:
            return price * discount.value / Decimal(100)
        return min(discount.value, price)

    async def effective_price(
        self, *, product_id: uuid.UUID, category_id: uuid.UUID | None, price: Decimal
    ) -> tuple[Decimal, Decimal | None]:
        """Returns (price_to_charge, original_price) — original_price is
        None when no active discount applies, meaning callers should keep
        whatever price/compare_at_price the product already had."""
        await self._ensure_loaded()
        candidates = (
            self._by_product.get(product_id)
            or (self._by_category.get(category_id) if category_id else None)
            or self._all_scope
        )
        if not candidates:
            return price, None
        best = max(candidates, key=lambda d: self._amount_off(price, d))
        amount_off = self._amount_off(price, best)
        if amount_off <= 0:
            return price, None
        discounted = max(price - amount_off, Decimal("0")).quantize(Decimal("0.01"))
        return discounted, price

    async def apply(
        self, item: Any, *, product_id: uuid.UUID, category_id: uuid.UUID | None
    ) -> None:
        """Mutates a schema instance's `price`/`compare_at_price` in place —
        used for ProductListItem/ProductRead/ProductSummary, which all carry
        those two fields. Leaves both untouched when no campaign discount
        applies, preserving a product's own manually-set compare_at_price."""
        new_price, original = await self.effective_price(
            product_id=product_id, category_id=category_id, price=item.price
        )
        if original is not None:
            item.price = new_price
            item.compare_at_price = original
