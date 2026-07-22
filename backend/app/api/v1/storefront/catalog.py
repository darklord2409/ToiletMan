import uuid
from typing import Any

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db
from app.core.i18n import translate
from app.dependencies.pagination import PaginationParams, pagination_params
from app.schemas.base import PaginatedResponse, PaginationMeta
from app.schemas.catalog.collection import CollectionRead
from app.schemas.catalog.manufacturer import ManufacturerRead
from app.schemas.catalog.product import ProductRead
from app.schemas.catalog.product_bulk import CatalogFiltersResponse
from app.schemas.catalog.product_label import ProductLabelRead
from app.schemas.catalog.product_type import ProductTypeRead
from app.schemas.content.banner import BannerRead
from app.schemas.storefront.catalog import CategoryTreeNode, ProductDetailResponse, ProductListItem
from app.services.storefront.catalog import StorefrontCatalogService

router = APIRouter(prefix="/storefront", tags=["storefront-catalog"])


def get_storefront_catalog_service(
    session: AsyncSession = Depends(get_db),
) -> StorefrontCatalogService:
    return StorefrontCatalogService(session)


def _paginated(items: list[Any], total: int, pagination: PaginationParams) -> PaginatedResponse:
    total_pages = (total + pagination.page_size - 1) // pagination.page_size if total else 0
    return PaginatedResponse(
        items=items,
        meta=PaginationMeta(
            page=pagination.page,
            page_size=pagination.page_size,
            total_items=total,
            total_pages=total_pages,
        ),
    )


def product_filters(
    category_id: uuid.UUID | None = Query(None),
    manufacturer_id: uuid.UUID | None = Query(None),
    product_type_id: uuid.UUID | None = Query(None),
    collection_id: uuid.UUID | None = Query(None),
    is_featured: bool | None = Query(None),
) -> dict[str, Any]:
    return {
        "category_id": category_id,
        "manufacturer_id": manufacturer_id,
        "product_type_id": product_type_id,
        "collection_id": collection_id,
        "is_featured": is_featured,
    }


@router.get(
    "/banners",
    response_model=list[BannerRead],
    status_code=status.HTTP_200_OK,
    summary=translate("swagger.storefront.banners"),
)
async def get_active_banners(
    service: StorefrontCatalogService = Depends(get_storefront_catalog_service),
) -> list[BannerRead]:
    return await service.get_active_banners()


@router.get(
    "/categories/tree",
    response_model=list[CategoryTreeNode],
    status_code=status.HTTP_200_OK,
    summary=translate("swagger.storefront.categories_tree"),
)
async def get_categories_tree(
    service: StorefrontCatalogService = Depends(get_storefront_catalog_service),
) -> list[CategoryTreeNode]:
    return await service.get_categories_tree()


@router.get(
    "/manufacturers",
    response_model=PaginatedResponse[ManufacturerRead],
    status_code=status.HTTP_200_OK,
    summary=translate("swagger.storefront.manufacturers"),
)
async def list_manufacturers(
    pagination: PaginationParams = Depends(pagination_params),
    service: StorefrontCatalogService = Depends(get_storefront_catalog_service),
) -> PaginatedResponse:
    items, total = await service.manufacturer_repo.list_all(
        offset=pagination.offset, limit=pagination.limit, filters={"is_active": True}
    )
    return _paginated(items, total, pagination)


@router.get(
    "/collections",
    response_model=PaginatedResponse[CollectionRead],
    status_code=status.HTTP_200_OK,
    summary=translate("swagger.storefront.collections"),
)
async def list_collections(
    pagination: PaginationParams = Depends(pagination_params),
    service: StorefrontCatalogService = Depends(get_storefront_catalog_service),
) -> PaginatedResponse:
    items, total = await service.collection_repo.list_all(
        offset=pagination.offset,
        limit=pagination.limit,
        filters={"is_active": True},
        sort_by="sort_order",
    )
    return _paginated(items, total, pagination)


@router.get(
    "/product-types",
    response_model=PaginatedResponse[ProductTypeRead],
    status_code=status.HTTP_200_OK,
    summary=translate("swagger.storefront.product_types"),
)
async def list_product_types(
    pagination: PaginationParams = Depends(pagination_params),
    service: StorefrontCatalogService = Depends(get_storefront_catalog_service),
) -> PaginatedResponse:
    items, total = await service.product_type_repo.list_all(
        offset=pagination.offset,
        limit=pagination.limit,
        filters={"is_active": True},
        sort_by="sort_order",
    )
    return _paginated(items, total, pagination)


@router.get(
    "/product-labels",
    response_model=PaginatedResponse[ProductLabelRead],
    status_code=status.HTTP_200_OK,
    summary=translate("swagger.storefront.product_labels"),
)
async def list_product_labels(
    pagination: PaginationParams = Depends(pagination_params),
    service: StorefrontCatalogService = Depends(get_storefront_catalog_service),
) -> PaginatedResponse:
    items, total = await service.product_label_repo.list_all(
        offset=pagination.offset,
        limit=pagination.limit,
        filters={"is_active": True},
        sort_by="sort_order",
    )
    return _paginated(items, total, pagination)


@router.get(
    "/products",
    response_model=PaginatedResponse[ProductListItem],
    status_code=status.HTTP_200_OK,
    summary=translate("swagger.storefront.products"),
)
async def list_products(
    pagination: PaginationParams = Depends(pagination_params),
    sort_by: str | None = Query(None),
    sort_order: str = Query("asc", pattern="^(asc|desc)$"),
    search: str | None = Query(None),
    filters: dict[str, Any] = Depends(product_filters),
    service: StorefrontCatalogService = Depends(get_storefront_catalog_service),
) -> PaginatedResponse:
    items, total = await service.list_products(
        offset=pagination.offset,
        limit=pagination.limit,
        filters=filters,
        search=search,
        sort_by=sort_by,
        sort_order=sort_order,
    )
    return _paginated(items, total, pagination)


@router.get(
    "/products/filters",
    response_model=CatalogFiltersResponse,
    status_code=status.HTTP_200_OK,
    summary=translate("swagger.storefront.products_filters"),
)
async def get_products_filters(
    category_id: uuid.UUID | None = Query(None),
    product_type_id: uuid.UUID | None = Query(None),
    service: StorefrontCatalogService = Depends(get_storefront_catalog_service),
) -> dict[str, Any]:
    return await service.get_filters(category_id=category_id, product_type_id=product_type_id)


@router.get(
    "/products/by-slug/{slug}/detail",
    response_model=ProductDetailResponse,
    status_code=status.HTTP_200_OK,
    summary=translate("swagger.storefront.product_full_detail"),
)
async def get_product_detail_by_slug(
    slug: str, service: StorefrontCatalogService = Depends(get_storefront_catalog_service)
) -> ProductDetailResponse:
    return await service.get_product_detail_by_slug(slug)


@router.get(
    "/products/{item_id}",
    response_model=ProductRead,
    status_code=status.HTTP_200_OK,
    summary=translate("swagger.storefront.product_detail"),
)
async def get_product(
    item_id: uuid.UUID, service: StorefrontCatalogService = Depends(get_storefront_catalog_service)
) -> Any:
    return await service.get_product(item_id)


@router.get(
    "/products/{item_id}/detail",
    response_model=ProductDetailResponse,
    status_code=status.HTTP_200_OK,
    summary=translate("swagger.storefront.product_full_detail"),
)
async def get_product_detail(
    item_id: uuid.UUID, service: StorefrontCatalogService = Depends(get_storefront_catalog_service)
) -> ProductDetailResponse:
    return await service.get_product_detail(item_id)
