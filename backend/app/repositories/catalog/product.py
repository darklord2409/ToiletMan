import uuid
from datetime import UTC, datetime
from typing import Any, cast

from sqlalchemy import Select, Table, bindparam, func, select, update
from sqlalchemy.orm import selectinload

from app.models.catalog.product import Product
from app.repositories.base import BaseRepository

_EXPORT_RELATIONS = (
    Product.category,
    Product.manufacturer,
    Product.unit,
    Product.product_type,
    Product.collection,
)


class ProductRepository(BaseRepository[Product]):
    model = Product

    def _base_query(self) -> Select[tuple[Product]]:
        # `translations` is eager-loaded because ProductRead serializes it
        # on every response; without this, Pydantic's post-request access
        # to a lazy relationship would attempt a sync load outside the
        # async greenlet context and raise MissingGreenlet.
        return super()._base_query().options(selectinload(Product.translations))

    def _apply_search(
        self,
        query: Select[tuple[Product]],
        search: str | None,
        search_fields: list[str] | None,
    ) -> Select[tuple[Product]]:
        """Overrides the base ILIKE substring search: at 100k+ rows a
        leading-wildcard ILIKE can't use an index, while the GIN-indexed
        `search_vector` generated column (see the Product model) answers
        this in milliseconds regardless of catalog size."""
        if not search:
            return query
        return query.where(Product.search_vector.op("@@")(func.plainto_tsquery("russian", search)))

    async def bulk_set_fields(self, product_ids: list[uuid.UUID], data: dict[str, Any]) -> int:
        """Sets the same field value(s) on N products in a single UPDATE
        statement — used by bulk status/category/manufacturer/collection
        change endpoints."""
        if not product_ids or not data:
            return 0
        stmt = (
            update(Product)
            .where(Product.id.in_(product_ids), Product.deleted_at.is_(None))
            .values(**data)
        )
        result = await self.session.execute(stmt)
        await self.session.flush()
        return int(result.rowcount or 0)

    async def bulk_soft_delete(self, product_ids: list[uuid.UUID]) -> int:
        if not product_ids:
            return 0
        stmt = (
            update(Product)
            .where(Product.id.in_(product_ids), Product.deleted_at.is_(None))
            .values(deleted_at=datetime.now(UTC))
        )
        result = await self.session.execute(stmt)
        await self.session.flush()
        return int(result.rowcount or 0)

    async def get_prices(self, product_ids: list[uuid.UUID]) -> dict[uuid.UUID, Any]:
        """Reads current prices for a batch of products in one query — used
        to snapshot old_price before a bulk price adjustment."""
        if not product_ids:
            return {}
        result = await self.session.execute(
            select(Product.id, Product.price).where(
                Product.id.in_(product_ids), Product.deleted_at.is_(None)
            )
        )
        return {row.id: row.price for row in result}

    async def list_for_export(
        self,
        *,
        ids: list[uuid.UUID] | None,
        filters: dict[str, Any] | None,
        search: str | None,
    ) -> list[Product]:
        """Export needs `category`/`manufacturer`/`unit`/`product_type`/
        `collection` as slugs/codes, not ids, so those relationships are
        eager-loaded here — unlike the default list/get path, where the
        Read schema only needs the FK id and eager-loading them would be
        wasted work on the hot path."""
        query = self._base_query()
        for relation in _EXPORT_RELATIONS:
            query = query.options(selectinload(relation))

        if ids:
            query = query.where(Product.id.in_(ids))
        else:
            query = self._apply_search(self._apply_filters(query, filters), search, None)

        result = await self.session.execute(query)
        return list(result.scalars().all())

    async def bulk_set_prices(self, new_prices: dict[uuid.UUID, Any]) -> None:
        """Applies a different new price per product in a single
        executemany-style round trip (SQLAlchemy bulk UPDATE by bound
        parameter) instead of one UPDATE per product.

        Built on `Product.__table__` (Core), not the `Product` ORM entity:
        the ORM's `update(Product)` construct special-cases a per-row
        executemany as a "bulk UPDATE by primary key" and demands the
        parameter dict use the PK's own attribute name, which conflicts
        with binding the WHERE clause under a distinct `pid` name here.
        Core bypasses that special-casing entirely — this repository
        doesn't need any already-loaded `Product` instances synchronized
        with the new prices, only a fresh read afterward."""
        if not new_prices:
            return
        table = cast(Table, Product.__table__)
        stmt = (
            update(table).where(table.c.id == bindparam("pid")).values(price=bindparam("new_price"))
        )
        await self.session.execute(
            stmt,
            [{"pid": pid, "new_price": price} for pid, price in new_prices.items()],
        )
        await self.session.flush()
