import uuid
from datetime import UTC, datetime
from decimal import Decimal
from typing import Any, Literal

from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from app.core.audit import record_audit_log
from app.exceptions.base import BadRequestError, NotFoundError
from app.models.catalog.attribute_set_item import AttributeSetItem
from app.models.catalog.product import Product
from app.models.catalog.product_attribute import ProductAttribute
from app.models.catalog.product_document import ProductDocument
from app.models.catalog.product_image import ProductImage
from app.models.catalog.product_label_assignment import ProductLabelAssignment
from app.models.catalog.product_translation import ProductTranslation
from app.models.catalog.product_type import ProductType
from app.models.catalog.product_video import ProductVideo
from app.models.enums import ActorType, ProductStatus
from app.models.system.price_history import PriceHistory
from app.repositories.catalog.product import ProductRepository
from app.schemas.catalog.product import ProductCreate, ProductUpdate
from app.services.base import BaseService
from app.services.translation import upsert_translations

_TRANSLATABLE_FIELDS = ("name", "description", "meta_title", "meta_description")


class ProductService(BaseService[Product, ProductCreate, ProductUpdate]):
    entity_name = "Product"
    resource = "products"
    search_fields = ["name", "sku", "slug", "description", "barcode"]

    def __init__(self, repository: ProductRepository) -> None:
        super().__init__(repository)
        self.repository: ProductRepository = repository

    # ------------------------------------------------------------------
    # Create / update — translations, price history, audit, attribute sync
    # ------------------------------------------------------------------

    async def create(self, obj_in: ProductCreate, actor_id: uuid.UUID | None = None) -> Product:
        data = obj_in.model_dump(exclude_unset=True)
        translations = data.pop("translations", None) or {}

        product = await self.repository.create(data)
        await self._sync_attributes_to_product_type(product)

        if translations:
            await upsert_translations(
                self.repository.session,
                translation_model=ProductTranslation,
                parent_fk_field="product_id",
                parent_id=product.id,
                translations=translations,
            )

        if product.price:
            self.repository.session.add(
                PriceHistory(
                    product_id=product.id,
                    changed_by_id=actor_id,
                    old_price=product.price,
                    new_price=product.price,
                    reason="Initial price",
                )
            )

        await record_audit_log(
            self.repository.session,
            actor_type=ActorType.ADMIN_USER if actor_id else None,
            actor_id=actor_id,
            action="product_created",
            entity_type="product",
            entity_id=product.id,
        )
        await self.repository.session.flush()
        await self.repository.session.refresh(product, attribute_names=["translations"])
        return product

    async def update(
        self, id: uuid.UUID, obj_in: ProductUpdate, actor_id: uuid.UUID | None = None
    ) -> Product:
        product = await self.get(id)
        data = obj_in.model_dump(exclude_unset=True)
        translations = data.pop("translations", None)

        old_price = product.price
        old_category_id = product.category_id
        old_collection_id = product.collection_id
        old_product_type_id = product.product_type_id

        if data:
            product = await self.repository.update(product, data)

        if translations:
            await upsert_translations(
                self.repository.session,
                translation_model=ProductTranslation,
                parent_fk_field="product_id",
                parent_id=product.id,
                translations=translations,
            )

        changes: dict[str, Any] = {}

        if "price" in data and product.price != old_price:
            self.repository.session.add(
                PriceHistory(
                    product_id=product.id,
                    changed_by_id=actor_id,
                    old_price=old_price,
                    new_price=product.price,
                )
            )
            changes["price"] = {"old": str(old_price), "new": str(product.price)}

        if "category_id" in data and product.category_id != old_category_id:
            changes["category_id"] = {"old": str(old_category_id), "new": str(product.category_id)}

        if "collection_id" in data and product.collection_id != old_collection_id:
            changes["collection_id"] = {
                "old": str(old_collection_id) if old_collection_id else None,
                "new": str(product.collection_id) if product.collection_id else None,
            }

        if "product_type_id" in data and product.product_type_id != old_product_type_id:
            await self._sync_attributes_to_product_type(product)
            changes["product_type_id"] = {
                "old": str(old_product_type_id),
                "new": str(product.product_type_id),
            }

        if changes or data:
            await record_audit_log(
                self.repository.session,
                actor_type=ActorType.ADMIN_USER if actor_id else None,
                actor_id=actor_id,
                action="product_updated",
                entity_type="product",
                entity_id=product.id,
                changes=changes or None,
            )

        await self.repository.session.flush()
        await self.repository.session.refresh(product, attribute_names=["translations"])
        return product

    async def _sync_attributes_to_product_type(self, product: Product) -> None:
        """"Changing Product Type must automatically update available
        specifications": removes attribute values for definitions no
        longer in the new type's attribute set, and seeds a default-value
        row for any newly-required/default-bearing definition that isn't
        set yet."""
        session = self.repository.session

        product_type = await session.get(ProductType, product.product_type_id)
        if product_type is None:
            return

        set_items = (
            (
                await session.execute(
                    select(AttributeSetItem).where(
                        AttributeSetItem.attribute_set_id == product_type.attribute_set_id
                    )
                )
            )
            .scalars()
            .all()
        )
        valid_definition_ids = {item.attribute_definition_id for item in set_items}

        existing_attrs = (
            (
                await session.execute(
                    select(ProductAttribute).where(ProductAttribute.product_id == product.id)
                )
            )
            .scalars()
            .all()
        )
        existing_by_definition = {a.attribute_definition_id: a for a in existing_attrs}

        for attr in existing_attrs:
            if attr.attribute_definition_id not in valid_definition_ids:
                await session.delete(attr)

        for item in set_items:
            if item.attribute_definition_id in existing_by_definition:
                continue
            if not item.default_value:
                continue
            session.add(
                ProductAttribute(
                    product_id=product.id,
                    attribute_definition_id=item.attribute_definition_id,
                    value_string=item.default_value,
                )
            )
        await session.flush()

    # ------------------------------------------------------------------
    # Archive / restore / clone
    # ------------------------------------------------------------------

    async def archive(self, id: uuid.UUID, actor_id: uuid.UUID | None = None) -> Product:
        return await self.update(id, ProductUpdate(status=ProductStatus.ARCHIVED), actor_id)

    async def restore(self, id: uuid.UUID, actor_id: uuid.UUID | None = None) -> Product:
        return await self.update(id, ProductUpdate(status=ProductStatus.ACTIVE), actor_id)

    async def clone(
        self,
        id: uuid.UUID,
        *,
        new_sku: str,
        new_slug: str,
        new_name: str | None = None,
        actor_id: uuid.UUID | None = None,
    ) -> Product:
        session = self.repository.session
        original = await session.get(
            Product,
            id,
            options=[
                selectinload(Product.images),
                selectinload(Product.attributes),
                selectinload(Product.documents),
                selectinload(Product.videos),
                selectinload(Product.translations),
                selectinload(Product.label_assignments),
            ],
        )
        if original is None or original.deleted_at is not None:
            raise NotFoundError(key="errors.not_found", params={"entity": self._entity_label()})

        clone = Product(
            category_id=original.category_id,
            manufacturer_id=original.manufacturer_id,
            unit_id=original.unit_id,
            product_type_id=original.product_type_id,
            collection_id=original.collection_id,
            sku=new_sku,
            barcode=None,
            slug=new_slug,
            name=new_name or f"{original.name} (copy)",
            description=original.description,
            status=ProductStatus.DRAFT,
            is_featured=False,
            weight_kg=original.weight_kg,
            price=original.price,
            compare_at_price=original.compare_at_price,
            cost_price=original.cost_price,
            currency=original.currency,
            stock_quantity=0,
            is_unlimited_stock=original.is_unlimited_stock,
            low_stock_threshold=original.low_stock_threshold,
            seo=original.seo,
        )
        session.add(clone)
        await session.flush()

        for image in original.images:
            session.add(
                ProductImage(
                    product_id=clone.id,
                    url=image.url,
                    alt_text=image.alt_text,
                    sort_order=image.sort_order,
                    is_primary=image.is_primary,
                )
            )
        for attr in original.attributes:
            session.add(
                ProductAttribute(
                    product_id=clone.id,
                    attribute_definition_id=attr.attribute_definition_id,
                    value_string=attr.value_string,
                    value_number=attr.value_number,
                    value_boolean=attr.value_boolean,
                    value_date=attr.value_date,
                    value_reference_id=attr.value_reference_id,
                )
            )
        for doc in original.documents:
            session.add(
                ProductDocument(
                    product_id=clone.id,
                    document_type=doc.document_type,
                    title=doc.title,
                    file_url=doc.file_url,
                    mime_type=doc.mime_type,
                    size_bytes=doc.size_bytes,
                    sort_order=doc.sort_order,
                )
            )
        for video in original.videos:
            session.add(
                ProductVideo(
                    product_id=clone.id,
                    video_type=video.video_type,
                    title=video.title,
                    url=video.url,
                    thumbnail_url=video.thumbnail_url,
                    sort_order=video.sort_order,
                )
            )
        for label in original.label_assignments:
            session.add(
                ProductLabelAssignment(
                    product_id=clone.id, product_label_id=label.product_label_id
                )
            )
        for translation in original.translations:
            session.add(
                ProductTranslation(
                    product_id=clone.id,
                    locale=translation.locale,
                    name=translation.name,
                    description=translation.description,
                    meta_title=translation.meta_title,
                    meta_description=translation.meta_description,
                )
            )

        await record_audit_log(
            session,
            actor_type=ActorType.ADMIN_USER if actor_id else None,
            actor_id=actor_id,
            action="product_cloned",
            entity_type="product",
            entity_id=clone.id,
            changes={"cloned_from": str(original.id)},
        )
        await session.flush()
        # See rollback_price() for why a full refresh is needed before the
        # translations-only one: `clone` was never routed through
        # BaseRepository.create()'s full post-flush refresh, so column
        # attributes like `updated_at` would otherwise still be expired.
        await session.refresh(clone)
        await session.refresh(clone, attribute_names=["translations"])
        return clone

    # ------------------------------------------------------------------
    # Bulk operations
    # ------------------------------------------------------------------

    async def bulk_status_change(
        self,
        product_ids: list[uuid.UUID],
        status: ProductStatus,
        actor_id: uuid.UUID | None = None,
    ) -> int:
        count = await self.repository.bulk_set_fields(product_ids, {"status": status})
        await self._bulk_audit(
            "bulk_status_change", product_ids, actor_id, {"status": status.value}
        )
        return count

    async def bulk_manufacturer_change(
        self,
        product_ids: list[uuid.UUID],
        manufacturer_id: uuid.UUID | None,
        actor_id: uuid.UUID | None = None,
    ) -> int:
        count = await self.repository.bulk_set_fields(
            product_ids, {"manufacturer_id": manufacturer_id}
        )
        await self._bulk_audit(
            "bulk_manufacturer_change",
            product_ids,
            actor_id,
            {"manufacturer_id": str(manufacturer_id) if manufacturer_id else None},
        )
        return count

    async def bulk_category_change(
        self,
        product_ids: list[uuid.UUID],
        category_id: uuid.UUID,
        actor_id: uuid.UUID | None = None,
    ) -> int:
        count = await self.repository.bulk_set_fields(product_ids, {"category_id": category_id})
        await self._bulk_audit(
            "bulk_category_change", product_ids, actor_id, {"category_id": str(category_id)}
        )
        return count

    async def bulk_collection_change(
        self,
        product_ids: list[uuid.UUID],
        collection_id: uuid.UUID | None,
        actor_id: uuid.UUID | None = None,
    ) -> int:
        count = await self.repository.bulk_set_fields(
            product_ids, {"collection_id": collection_id}
        )
        await self._bulk_audit(
            "bulk_collection_change",
            product_ids,
            actor_id,
            {"collection_id": str(collection_id) if collection_id else None},
        )
        return count

    async def bulk_update_fields(
        self,
        product_ids: list[uuid.UUID],
        data: dict[str, Any],
        actor_id: uuid.UUID | None = None,
    ) -> int:
        count = await self.repository.bulk_set_fields(product_ids, data)
        await self._bulk_audit(
            "bulk_update", product_ids, actor_id, {k: str(v) for k, v in data.items()}
        )
        return count

    async def bulk_delete(
        self, product_ids: list[uuid.UUID], actor_id: uuid.UUID | None = None
    ) -> int:
        count = await self.repository.bulk_soft_delete(product_ids)
        await self._bulk_audit("bulk_delete", product_ids, actor_id, None)
        return count

    async def bulk_price_adjust(
        self,
        product_ids: list[uuid.UUID],
        *,
        mode: Literal["percentage", "fixed"],
        direction: Literal["increase", "decrease"],
        value: Decimal,
        actor_id: uuid.UUID | None = None,
    ) -> int:
        if value < 0:
            raise BadRequestError(key="errors.validation_error")

        old_prices = await self.repository.get_prices(product_ids)
        sign = 1 if direction == "increase" else -1
        new_prices: dict[uuid.UUID, Decimal] = {}
        for pid, old_price in old_prices.items():
            delta = old_price * (value / Decimal(100)) if mode == "percentage" else value
            new_price = max(old_price + sign * delta, Decimal("0"))
            new_prices[pid] = new_price.quantize(Decimal("0.01"))

        await self.repository.bulk_set_prices(new_prices)

        session = self.repository.session
        for pid, new_price in new_prices.items():
            session.add(
                PriceHistory(
                    product_id=pid,
                    changed_by_id=actor_id,
                    old_price=old_prices[pid],
                    new_price=new_price,
                    reason=f"Bulk {mode} {direction} of {value}",
                )
            )
        await self._bulk_audit(
            "bulk_price_adjust",
            list(new_prices.keys()),
            actor_id,
            {"mode": mode, "direction": direction, "value": str(value)},
        )
        return len(new_prices)

    async def rollback_price(
        self, product_id: uuid.UUID, price_history_id: uuid.UUID, actor_id: uuid.UUID | None = None
    ) -> Product:
        session = self.repository.session
        history_entry = await session.get(PriceHistory, price_history_id)
        if history_entry is None or history_entry.product_id != product_id:
            raise NotFoundError(
                key="errors.not_found", params={"entity": self._entity_label() + " price history"}
            )

        product = await self.get(product_id)
        old_price = product.price
        product.price = history_entry.old_price
        session.add(
            PriceHistory(
                product_id=product.id,
                changed_by_id=actor_id,
                old_price=old_price,
                new_price=product.price,
                reason=f"Rollback to price history entry {price_history_id}",
            )
        )
        await record_audit_log(
            session,
            actor_type=ActorType.ADMIN_USER if actor_id else None,
            actor_id=actor_id,
            action="price_rollback",
            entity_type="product",
            entity_id=product.id,
            changes={"old": str(old_price), "new": str(product.price)},
        )
        await session.flush()
        # Full refresh first: `product.price` was set directly (not through
        # BaseRepository.update(), which already refreshes fully), so
        # `updated_at` is still expired from the onupdate-triggering flush
        # above — a bare API response would hit MissingGreenlet serializing
        # it otherwise. The second, partial refresh re-establishes the
        # eager-loaded `translations` relationship for serialization.
        await session.refresh(product)
        await session.refresh(product, attribute_names=["translations"])
        return product

    async def apply_scheduled_prices(self) -> int:
        """Idempotent: activates any product's `future_price` whose
        `future_price_activates_at` has passed. No task scheduler exists in
        this project yet, so this is exposed as an admin-triggerable
        endpoint rather than a cron job — see CATALOG.md."""
        session = self.repository.session
        now = datetime.now(UTC)
        due = (
            (
                await session.execute(
                    select(Product).where(
                        Product.deleted_at.is_(None),
                        Product.future_price.is_not(None),
                        Product.future_price_activates_at.is_not(None),
                        Product.future_price_activates_at <= now,
                    )
                )
            )
            .scalars()
            .all()
        )
        for product in due:
            # `future_price.is_not(None)` was part of the WHERE clause above,
            # so this is never None at runtime; mypy can't infer that from
            # the query filter alone.
            assert product.future_price is not None
            old_price = product.price
            product.price = product.future_price
            product.future_price = None
            product.future_price_activates_at = None
            session.add(
                PriceHistory(
                    product_id=product.id,
                    old_price=old_price,
                    new_price=product.price,
                    reason="Scheduled future price activation",
                )
            )
        if due:
            await session.flush()
        return len(due)

    async def _bulk_audit(
        self,
        action: str,
        product_ids: list[uuid.UUID],
        actor_id: uuid.UUID | None,
        changes: dict[str, Any] | None,
    ) -> None:
        session = self.repository.session
        merged_changes = {"product_ids": [str(pid) for pid in product_ids], **(changes or {})}
        await record_audit_log(
            session,
            actor_type=ActorType.ADMIN_USER if actor_id else None,
            actor_id=actor_id,
            action=action,
            entity_type="product",
            changes=merged_changes,
        )
        await session.flush()

    # ------------------------------------------------------------------
    # Storefront-facing filters/facets
    # ------------------------------------------------------------------

    async def get_filters(
        self,
        *,
        category_id: uuid.UUID | list[uuid.UUID] | None = None,
        product_type_id: uuid.UUID | None = None,
    ) -> dict[str, Any]:
        from app.models.catalog.category import Category
        from app.models.catalog.collection import Collection
        from app.models.catalog.manufacturer import Manufacturer

        session = self.repository.session
        conditions = [Product.deleted_at.is_(None), Product.status == ProductStatus.ACTIVE]
        if category_id:
            if isinstance(category_id, list):
                conditions.append(Product.category_id.in_(category_id))
            else:
                conditions.append(Product.category_id == category_id)
        if product_type_id:
            conditions.append(Product.product_type_id == product_type_id)

        price_row = (
            await session.execute(
                select(func.min(Product.price), func.max(Product.price)).where(*conditions)
            )
        ).one()

        manufacturers = (
            await session.execute(
                select(Manufacturer.id, Manufacturer.name, func.count(Product.id))
                .join(Product, Product.manufacturer_id == Manufacturer.id)
                .where(*conditions)
                .group_by(Manufacturer.id, Manufacturer.name)
                .order_by(Manufacturer.name)
            )
        ).all()

        collections = (
            await session.execute(
                select(Collection.id, Collection.name, func.count(Product.id))
                .join(Product, Product.collection_id == Collection.id)
                .where(*conditions)
                .group_by(Collection.id, Collection.name)
                .order_by(Collection.name)
            )
        ).all()

        categories = (
            await session.execute(
                select(Category.id, Category.name, func.count(Product.id))
                .join(Product, Product.category_id == Category.id)
                .where(*conditions)
                .group_by(Category.id, Category.name)
                .order_by(Category.name)
            )
        ).all()

        return {
            "price_min": price_row[0],
            "price_max": price_row[1],
            "manufacturers": [
                {"id": row[0], "name": row[1], "count": row[2]} for row in manufacturers
            ],
            "collections": [{"id": row[0], "name": row[1], "count": row[2]} for row in collections],
            "categories": [{"id": row[0], "name": row[1], "count": row[2]} for row in categories],
        }
