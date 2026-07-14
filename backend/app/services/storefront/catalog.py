import uuid
from datetime import UTC, datetime
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.i18n import translate
from app.exceptions.base import NotFoundError
from app.models.enums import AnalyticsEventType, ProductStatus, RecommendationType
from app.repositories.catalog.attribute_definition import AttributeDefinitionRepository
from app.repositories.catalog.category import CategoryRepository
from app.repositories.catalog.collection import CollectionRepository
from app.repositories.catalog.manufacturer import ManufacturerRepository
from app.repositories.catalog.product import ProductRepository
from app.repositories.catalog.product_analytics_event import ProductAnalyticsEventRepository
from app.repositories.catalog.product_attribute import ProductAttributeRepository
from app.repositories.catalog.product_document import ProductDocumentRepository
from app.repositories.catalog.product_image import ProductImageRepository
from app.repositories.catalog.product_label import ProductLabelRepository
from app.repositories.catalog.product_label_assignment import ProductLabelAssignmentRepository
from app.repositories.catalog.product_recommendation import ProductRecommendationRepository
from app.repositories.catalog.product_type import ProductTypeRepository
from app.repositories.catalog.product_video import ProductVideoRepository
from app.repositories.catalog.reference_value import ReferenceValueRepository
from app.repositories.catalog.unit import UnitRepository
from app.repositories.content.banner import BannerRepository
from app.schemas.catalog.product import ProductRead
from app.schemas.content.banner import BannerRead
from app.schemas.storefront.catalog import (
    CategoryTreeNode,
    ProductDetailResponse,
    ProductListItem,
    ProductRecommendations,
    ResolvedAttribute,
    ResolvedLabel,
    ResolvedReferenceValue,
)
from app.services.catalog.product import ProductService


class StorefrontCatalogService:
    """Read-only, publicly-reachable catalog access for the Mini App —
    always forces `status=active` regardless of caller-supplied filters, and
    aggregates the per-product side-tables (images/docs/videos/specs/
    labels) that the admin API leaves as separate ?product_id= calls, since
    a storefront product page needs all of it in one round trip."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.product_service = ProductService(ProductRepository(session))
        self.category_repo = CategoryRepository(session)
        self.manufacturer_repo = ManufacturerRepository(session)
        self.collection_repo = CollectionRepository(session)
        self.product_type_repo = ProductTypeRepository(session)
        self.product_label_repo = ProductLabelRepository(session)
        self.image_repo = ProductImageRepository(session)
        self.document_repo = ProductDocumentRepository(session)
        self.video_repo = ProductVideoRepository(session)
        self.attribute_repo = ProductAttributeRepository(session)
        self.label_assignment_repo = ProductLabelAssignmentRepository(session)
        self.attribute_definition_repo = AttributeDefinitionRepository(session)
        self.reference_value_repo = ReferenceValueRepository(session)
        self.unit_repo = UnitRepository(session)
        self.banner_repo = BannerRepository(session)
        self.recommendation_repo = ProductRecommendationRepository(session)
        self.analytics_event_repo = ProductAnalyticsEventRepository(session)

    async def _to_list_items(self, products: list[Any]) -> list[ProductListItem]:
        image_map = await self.image_repo.get_primary_image_map([p.id for p in products])
        type_ids = {p.product_type_id for p in products if p.product_type_id is not None}
        default_image_by_type: dict[uuid.UUID, str | None] = {}
        for type_id in type_ids:
            product_type = await self.product_type_repo.get(type_id)
            default_image_by_type[type_id] = (
                product_type.default_image_url if product_type else None
            )

        results = []
        for product in products:
            list_item = ProductListItem.model_validate(product)
            image = image_map.get(product.id)
            if image:
                list_item.primary_image_url = image.url
            elif product.product_type_id is not None:
                list_item.primary_image_url = default_image_by_type.get(product.product_type_id)
            else:
                list_item.primary_image_url = None
            results.append(list_item)
        return results

    async def _expand_category_ids(self, category_id: uuid.UUID) -> list[uuid.UUID]:
        # Products are only ever assigned to leaf categories (see the 3
        # top-level umbrella categories from the BOOYEA import, which have
        # zero direct products of their own) — filtering storefront listings
        # by exact category_id would make every parent category look empty
        # even though its children are full of products. Expand to the
        # whole subtree so browsing a parent category aggregates its
        # descendants, matching what a shopper actually expects to see.
        categories, _ = await self.category_repo.list_all(
            filters={"is_active": True}, limit=1000
        )
        children_by_parent: dict[uuid.UUID, list[uuid.UUID]] = {}
        for category in categories:
            if category.parent_id is not None:
                children_by_parent.setdefault(category.parent_id, []).append(category.id)

        ids = [category_id]
        queue = [category_id]
        while queue:
            current = queue.pop()
            for child_id in children_by_parent.get(current, []):
                ids.append(child_id)
                queue.append(child_id)
        return ids

    async def list_products(
        self,
        *,
        offset: int,
        limit: int,
        filters: dict[str, Any] | None,
        search: str | None,
        sort_by: str | None,
        sort_order: str,
    ) -> tuple[list[ProductListItem], int]:
        merged = {**(filters or {}), "status": ProductStatus.ACTIVE}
        if merged.get("category_id"):
            merged["category_id"] = await self._expand_category_ids(merged["category_id"])
        items, total = await self.product_service.list(
            offset=offset,
            limit=limit,
            filters=merged,
            search=search,
            sort_by=sort_by,
            sort_order=sort_order,
        )
        return await self._to_list_items(items), total

    async def get_product(self, product_id: uuid.UUID) -> Any:
        product = await self.product_service.get(product_id)
        if product.status != ProductStatus.ACTIVE:
            raise NotFoundError(
                key="errors.not_found", params={"entity": translate("resource.products")}
            )
        return product

    async def get_filters(
        self, *, category_id: uuid.UUID | None, product_type_id: uuid.UUID | None
    ) -> dict[str, Any]:
        expanded_category_ids = (
            await self._expand_category_ids(category_id) if category_id else None
        )
        return await self.product_service.get_filters(
            category_id=expanded_category_ids, product_type_id=product_type_id
        )

    async def get_active_banners(self) -> list[BannerRead]:
        banners, _ = await self.banner_repo.list_all(
            filters={"is_active": True}, limit=50, sort_by="sort_order"
        )
        now = datetime.now(UTC)
        return [
            BannerRead.model_validate(banner)
            for banner in banners
            if (banner.starts_at is None or banner.starts_at <= now)
            and (banner.ends_at is None or banner.ends_at >= now)
        ]

    async def get_categories_tree(self) -> list[CategoryTreeNode]:
        categories, _ = await self.category_repo.list_all(
            filters={"is_active": True}, limit=1000, sort_by="sort_order"
        )
        by_parent: dict[uuid.UUID | None, list[Any]] = {}
        for category in categories:
            by_parent.setdefault(category.parent_id, []).append(category)

        def build(parent_id: uuid.UUID | None) -> list[CategoryTreeNode]:
            return [
                CategoryTreeNode(
                    id=category.id,
                    name=category.name,
                    slug=category.slug,
                    sort_order=category.sort_order,
                    is_featured=category.is_featured,
                    image_url=category.image_url,
                    children=build(category.id),
                )
                for category in by_parent.get(parent_id, [])
            ]

        return build(None)

    async def get_product_detail(self, product_id: uuid.UUID) -> ProductDetailResponse:
        product = await self.get_product(product_id)
        # Anonymous-only: this endpoint has no auth dependency (product
        # pages must be browsable without a Telegram session), so there's
        # no customer identity to attribute the view to.
        await self.analytics_event_repo.log(
            product_id=product_id, event_type=AnalyticsEventType.VIEW
        )

        images, _ = await self.image_repo.list_all(
            filters={"product_id": product_id}, limit=100, sort_by="sort_order"
        )
        documents, _ = await self.document_repo.list_all(
            filters={"product_id": product_id}, limit=100, sort_by="sort_order"
        )
        videos, _ = await self.video_repo.list_all(
            filters={"product_id": product_id}, limit=100, sort_by="sort_order"
        )
        raw_attributes, _ = await self.attribute_repo.list_all(
            filters={"product_id": product_id}, limit=200
        )
        label_assignments, _ = await self.label_assignment_repo.list_all(
            filters={"product_id": product_id}, limit=50
        )

        resolved_attributes = []
        for attr in raw_attributes:
            definition = await self.attribute_definition_repo.get(attr.attribute_definition_id)
            if definition is None:
                continue
            unit_symbol = None
            if definition.unit_id:
                unit = await self.unit_repo.get(definition.unit_id)
                unit_symbol = unit.symbol if unit else None
            reference_value = None
            if attr.value_reference_id:
                ref = await self.reference_value_repo.get(attr.value_reference_id)
                if ref is not None:
                    reference_value = ResolvedReferenceValue(
                        id=ref.id,
                        code=ref.code,
                        translations=_translations_dict(ref.translations),
                    )
            resolved_attributes.append(
                ResolvedAttribute(
                    attribute_definition_id=definition.id,
                    code=definition.code,
                    name=definition.name,
                    translations=_translations_dict(definition.translations),
                    data_type=definition.data_type,
                    unit_symbol=unit_symbol,
                    value_string=attr.value_string,
                    value_number=attr.value_number,
                    value_boolean=attr.value_boolean,
                    value_date=attr.value_date.isoformat() if attr.value_date else None,
                    reference_value=reference_value,
                )
            )

        resolved_labels = []
        for assignment in label_assignments:
            label = await self.product_label_repo.get(assignment.product_label_id)
            if label is None or not label.is_active:
                continue
            resolved_labels.append(
                ResolvedLabel(
                    id=label.id,
                    code=label.code,
                    badge_color=label.badge_color,
                    translations=_translations_dict(label.translations),
                )
            )

        recommendations = await self.get_recommendations(product)

        return ProductDetailResponse(
            product=ProductRead.model_validate(product),
            images=list(images),
            documents=list(documents),
            videos=list(videos),
            attributes=resolved_attributes,
            labels=resolved_labels,
            recommendations=recommendations,
        )

    async def get_recommendations(self, product: Any) -> ProductRecommendations:
        """Combines admin-curated links (`ProductRecommendation` rows) with
        two computed-on-the-fly groups that need no curation at all: other
        active products in the same collection, and "similar" active
        products sharing this one's category plus its manufacturer or
        product type."""
        curated, _ = await self.recommendation_repo.list_all(
            filters={"product_id": product.id}, limit=100, sort_by="sort_order"
        )
        curated_ids_by_type: dict[RecommendationType, list[uuid.UUID]] = {
            rec_type: [] for rec_type in RecommendationType
        }
        for rec in curated:
            curated_ids_by_type[rec.relation_type].append(rec.recommended_product_id)

        async def _load_active(ids: list[uuid.UUID]) -> list[ProductListItem]:
            products = []
            for product_id in ids:
                candidate = await self.product_service.repository.get(product_id)
                if candidate is not None and candidate.status == ProductStatus.ACTIVE:
                    products.append(candidate)
            return await self._to_list_items(products)

        frequently_bought_together = await _load_active(
            curated_ids_by_type[RecommendationType.FREQUENTLY_BOUGHT_TOGETHER]
        )
        accessories = await _load_active(curated_ids_by_type[RecommendationType.ACCESSORY])
        related = await _load_active(curated_ids_by_type[RecommendationType.RELATED])

        excluded_ids = {product.id}
        excluded_ids |= {rec_id for ids in curated_ids_by_type.values() for rec_id in ids}

        same_collection: list[Any] = []
        if product.collection_id is not None:
            items, _ = await self.product_service.list(
                offset=0,
                limit=8 + len(excluded_ids),
                filters={"collection_id": product.collection_id, "status": ProductStatus.ACTIVE},
                search=None,
                sort_by="is_featured",
                sort_order="desc",
            )
            same_collection = [p for p in items if p.id not in excluded_ids][:8]
        excluded_ids |= {p.id for p in same_collection}

        similar: list[Any] = []
        if product.manufacturer_id is not None:
            items, _ = await self.product_service.list(
                offset=0,
                limit=8 + len(excluded_ids),
                filters={
                    "category_id": product.category_id,
                    "manufacturer_id": product.manufacturer_id,
                    "status": ProductStatus.ACTIVE,
                },
                search=None,
                sort_by="is_featured",
                sort_order="desc",
            )
            similar = [p for p in items if p.id not in excluded_ids][:8]
        if len(similar) < 8:
            items, _ = await self.product_service.list(
                offset=0,
                limit=8 + len(excluded_ids) - len(similar),
                filters={
                    "category_id": product.category_id,
                    "product_type_id": product.product_type_id,
                    "status": ProductStatus.ACTIVE,
                },
                search=None,
                sort_by="is_featured",
                sort_order="desc",
            )
            existing_ids = {p.id for p in similar}
            similar += [
                p for p in items if p.id not in excluded_ids and p.id not in existing_ids
            ][: 8 - len(similar)]

        return ProductRecommendations(
            frequently_bought_together=frequently_bought_together,
            accessories=accessories,
            related=related,
            same_collection=await self._to_list_items(same_collection),
            similar=await self._to_list_items(similar),
        )


def _translations_dict(rows: Any) -> dict[str, dict[str, Any]]:
    return {row.locale: {"name": row.name} for row in rows}
