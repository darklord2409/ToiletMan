import uuid
from typing import Any, Literal

from fastapi import APIRouter, Depends, File, Query, UploadFile, status
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db
from app.core.i18n import translate
from app.dependencies.factory import make_service_dependency
from app.dependencies.pagination import PaginationParams, pagination_params
from app.dependencies.permissions import require_permission
from app.models.enums import ProductStatus
from app.models.users.admin_user import AdminUser
from app.repositories.catalog.product import ProductRepository
from app.schemas.base import PaginatedResponse, PaginationMeta
from app.schemas.catalog.product import ProductCreate, ProductRead, ProductUpdate
from app.schemas.catalog.product_bulk import (
    BulkCategoryChange,
    BulkCollectionChange,
    BulkFieldUpdate,
    BulkManufacturerChange,
    BulkOperationResult,
    BulkPriceAdjust,
    BulkProductIds,
    BulkStatusChange,
    CatalogFiltersResponse,
    CloneProductRequest,
    PriceRollbackRequest,
)
from app.schemas.catalog.product_import_export import (
    ImportCommitResponse,
    ImportMode,
    ImportPreviewResponse,
)
from app.services.catalog.product import ProductService
from app.services.catalog.product_import_export import ProductImportExportService

get_product_service = make_service_dependency(ProductService, ProductRepository)


def get_import_export_service(
    session: AsyncSession = Depends(get_db),
    product_service: ProductService = Depends(get_product_service),
) -> ProductImportExportService:
    return ProductImportExportService(session, product_service)


def product_filters(
    category_id: uuid.UUID | None = Query(
        None, description=translate("swagger.filters.category_id")
    ),
    manufacturer_id: uuid.UUID | None = Query(
        None, description=translate("swagger.filters.manufacturer_id")
    ),
    product_type_id: uuid.UUID | None = Query(
        None, description=translate("swagger.filters.product_type_id")
    ),
    collection_id: uuid.UUID | None = Query(
        None, description=translate("swagger.filters.collection_id")
    ),
    product_status: ProductStatus | None = Query(
        None, description=translate("swagger.filters.product_status")
    ),
) -> dict[str, Any]:
    return {
        "category_id": category_id,
        "manufacturer_id": manufacturer_id,
        "product_type_id": product_type_id,
        "collection_id": collection_id,
        "status": product_status,
    }


router = APIRouter(prefix="/products", tags=["products"])


def _perm(action: str) -> list[Any]:
    return [Depends(require_permission(f"products.{action}"))]


def _price_perm() -> list[Any]:
    return [Depends(require_permission("prices.update"))]


@router.get(
    "",
    response_model=PaginatedResponse[ProductRead],
    status_code=status.HTTP_200_OK,
    summary=translate("swagger.list_summary", resource=translate("resource.products")),
    dependencies=_perm("read"),
)
async def list_products(
    pagination: PaginationParams = Depends(pagination_params),
    sort_by: str | None = Query(None, description=translate("swagger.filters.sort_by")),
    sort_order: str = Query(
        "asc", pattern="^(asc|desc)$", description=translate("swagger.filters.sort_order")
    ),
    search: str | None = Query(None, description=translate("swagger.filters.search")),
    filters: dict[str, Any] = Depends(product_filters),
    service: ProductService = Depends(get_product_service),
) -> PaginatedResponse:
    items, total = await service.list(
        offset=pagination.offset,
        limit=pagination.limit,
        filters=filters,
        search=search,
        sort_by=sort_by,
        sort_order=sort_order,
    )
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


@router.get(
    "/filters",
    response_model=CatalogFiltersResponse,
    status_code=status.HTTP_200_OK,
    summary=translate("swagger.products.filters"),
    dependencies=_perm("read"),
)
async def get_product_filters(
    category_id: uuid.UUID | None = Query(None),
    product_type_id: uuid.UUID | None = Query(None),
    service: ProductService = Depends(get_product_service),
) -> dict[str, Any]:
    return await service.get_filters(category_id=category_id, product_type_id=product_type_id)


@router.post(
    "/apply-scheduled-prices",
    response_model=BulkOperationResult,
    status_code=status.HTTP_200_OK,
    summary=translate("swagger.products.apply_scheduled_prices"),
    dependencies=_price_perm(),
)
async def apply_scheduled_prices(
    service: ProductService = Depends(get_product_service),
) -> BulkOperationResult:
    count = await service.apply_scheduled_prices()
    return BulkOperationResult(updated_count=count)


@router.post(
    "/bulk/status",
    response_model=BulkOperationResult,
    status_code=status.HTTP_200_OK,
    summary=translate("swagger.products.bulk_status"),
    dependencies=_perm("update"),
)
async def bulk_status_change(
    payload: BulkStatusChange,
    current_user: AdminUser = Depends(require_permission("products.update")),
    service: ProductService = Depends(get_product_service),
) -> BulkOperationResult:
    count = await service.bulk_status_change(payload.product_ids, payload.status, current_user.id)
    return BulkOperationResult(updated_count=count)


@router.post(
    "/bulk/manufacturer",
    response_model=BulkOperationResult,
    status_code=status.HTTP_200_OK,
    summary=translate("swagger.products.bulk_manufacturer"),
    dependencies=_perm("update"),
)
async def bulk_manufacturer_change(
    payload: BulkManufacturerChange,
    current_user: AdminUser = Depends(require_permission("products.update")),
    service: ProductService = Depends(get_product_service),
) -> BulkOperationResult:
    count = await service.bulk_manufacturer_change(
        payload.product_ids, payload.manufacturer_id, current_user.id
    )
    return BulkOperationResult(updated_count=count)


@router.post(
    "/bulk/category",
    response_model=BulkOperationResult,
    status_code=status.HTTP_200_OK,
    summary=translate("swagger.products.bulk_category"),
    dependencies=_perm("update"),
)
async def bulk_category_change(
    payload: BulkCategoryChange,
    current_user: AdminUser = Depends(require_permission("products.update")),
    service: ProductService = Depends(get_product_service),
) -> BulkOperationResult:
    count = await service.bulk_category_change(
        payload.product_ids, payload.category_id, current_user.id
    )
    return BulkOperationResult(updated_count=count)


@router.post(
    "/bulk/collection",
    response_model=BulkOperationResult,
    status_code=status.HTTP_200_OK,
    summary=translate("swagger.products.bulk_collection"),
    dependencies=_perm("update"),
)
async def bulk_collection_change(
    payload: BulkCollectionChange,
    current_user: AdminUser = Depends(require_permission("products.update")),
    service: ProductService = Depends(get_product_service),
) -> BulkOperationResult:
    count = await service.bulk_collection_change(
        payload.product_ids, payload.collection_id, current_user.id
    )
    return BulkOperationResult(updated_count=count)


@router.post(
    "/bulk/update",
    response_model=BulkOperationResult,
    status_code=status.HTTP_200_OK,
    summary=translate("swagger.products.bulk_update"),
    dependencies=_perm("update"),
)
async def bulk_field_update(
    payload: BulkFieldUpdate,
    current_user: AdminUser = Depends(require_permission("products.update")),
    service: ProductService = Depends(get_product_service),
) -> BulkOperationResult:
    count = await service.bulk_update_fields(payload.product_ids, payload.fields, current_user.id)
    return BulkOperationResult(updated_count=count)


@router.post(
    "/bulk/delete",
    response_model=BulkOperationResult,
    status_code=status.HTTP_200_OK,
    summary=translate("swagger.products.bulk_delete"),
    dependencies=_perm("delete"),
)
async def bulk_delete(
    payload: BulkProductIds,
    current_user: AdminUser = Depends(require_permission("products.delete")),
    service: ProductService = Depends(get_product_service),
) -> BulkOperationResult:
    count = await service.bulk_delete(payload.product_ids, current_user.id)
    return BulkOperationResult(updated_count=count)


@router.post(
    "/bulk/price-adjust",
    response_model=BulkOperationResult,
    status_code=status.HTTP_200_OK,
    summary=translate("swagger.products.bulk_price_adjust"),
    dependencies=_price_perm(),
)
async def bulk_price_adjust(
    payload: BulkPriceAdjust,
    current_user: AdminUser = Depends(require_permission("prices.update")),
    service: ProductService = Depends(get_product_service),
) -> BulkOperationResult:
    count = await service.bulk_price_adjust(
        payload.product_ids,
        mode=payload.mode,
        direction=payload.direction,
        value=payload.value,
        actor_id=current_user.id,
    )
    return BulkOperationResult(updated_count=count)


@router.post(
    "/import/preview",
    response_model=ImportPreviewResponse,
    status_code=status.HTTP_200_OK,
    summary=translate("swagger.products.import_preview"),
    dependencies=_perm("create"),
)
async def import_preview(
    mode: ImportMode = Query("full"),
    file: UploadFile = File(...),
    service: ProductImportExportService = Depends(get_import_export_service),
) -> ImportPreviewResponse:
    content = await file.read()
    rows = service.parse_file(file.filename or "", content)
    return await service.preview_import(rows, mode)


@router.post(
    "/import/commit",
    response_model=ImportCommitResponse,
    status_code=status.HTTP_200_OK,
    summary=translate("swagger.products.import_commit"),
    dependencies=_perm("create"),
)
async def import_commit(
    mode: ImportMode = Query("full"),
    atomic: bool = Query(False),
    file: UploadFile = File(...),
    current_user: AdminUser = Depends(require_permission("products.create")),
    service: ProductImportExportService = Depends(get_import_export_service),
) -> ImportCommitResponse:
    content = await file.read()
    rows = service.parse_file(file.filename or "", content)
    return await service.commit_import(rows, mode, atomic=atomic, actor_id=current_user.id)


@router.get(
    "/export",
    status_code=status.HTTP_200_OK,
    summary=translate("swagger.products.export"),
    dependencies=_perm("read"),
)
async def export_products(
    fmt: Literal["csv", "xlsx"] = Query("csv"),
    product_ids: str | None = Query(None, description="Comma-separated product ids to export"),
    filters: dict[str, Any] = Depends(product_filters),
    search: str | None = Query(None),
    service: ProductImportExportService = Depends(get_import_export_service),
    product_service: ProductService = Depends(get_product_service),
) -> Response:
    ids = (
        [uuid.UUID(pid.strip()) for pid in product_ids.split(",") if pid.strip()]
        if product_ids
        else None
    )
    items = await product_service.repository.list_for_export(
        ids=ids, filters=filters, search=search
    )

    content, media_type = await service.export_products(items, fmt)
    filename = f"products.{fmt}"
    return Response(
        content=content,
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get(
    "/{item_id}",
    response_model=ProductRead,
    status_code=status.HTTP_200_OK,
    summary=translate("swagger.get_summary", resource=translate("resource.products")),
    dependencies=_perm("read"),
)
async def get_product(
    item_id: uuid.UUID, service: ProductService = Depends(get_product_service)
) -> Any:
    return await service.get(item_id)


@router.post(
    "",
    response_model=ProductRead,
    status_code=status.HTTP_201_CREATED,
    summary=translate("swagger.create_summary", resource=translate("resource.products")),
    dependencies=_perm("create"),
)
async def create_product(
    payload: ProductCreate,
    current_user: AdminUser = Depends(require_permission("products.create")),
    service: ProductService = Depends(get_product_service),
) -> Any:
    return await service.create(payload, current_user.id)


@router.patch(
    "/{item_id}",
    response_model=ProductRead,
    status_code=status.HTTP_200_OK,
    summary=translate("swagger.update_summary", resource=translate("resource.products")),
    dependencies=_perm("update"),
)
async def update_product(
    item_id: uuid.UUID,
    payload: ProductUpdate,
    current_user: AdminUser = Depends(require_permission("products.update")),
    service: ProductService = Depends(get_product_service),
) -> Any:
    return await service.update(item_id, payload, current_user.id)


@router.delete(
    "/{item_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary=translate("swagger.delete_summary", resource=translate("resource.products")),
    dependencies=_perm("delete"),
)
async def delete_product(
    item_id: uuid.UUID,
    current_user: AdminUser = Depends(require_permission("products.delete")),
    service: ProductService = Depends(get_product_service),
) -> None:
    await service.bulk_delete([item_id], current_user.id)


@router.post(
    "/{item_id}/archive",
    response_model=ProductRead,
    status_code=status.HTTP_200_OK,
    summary=translate("swagger.products.archive"),
    dependencies=_perm("update"),
)
async def archive_product(
    item_id: uuid.UUID,
    current_user: AdminUser = Depends(require_permission("products.update")),
    service: ProductService = Depends(get_product_service),
) -> Any:
    return await service.archive(item_id, current_user.id)


@router.post(
    "/{item_id}/restore",
    response_model=ProductRead,
    status_code=status.HTTP_200_OK,
    summary=translate("swagger.products.restore"),
    dependencies=_perm("update"),
)
async def restore_product(
    item_id: uuid.UUID,
    current_user: AdminUser = Depends(require_permission("products.update")),
    service: ProductService = Depends(get_product_service),
) -> Any:
    return await service.restore(item_id, current_user.id)


@router.post(
    "/{item_id}/clone",
    response_model=ProductRead,
    status_code=status.HTTP_201_CREATED,
    summary=translate("swagger.products.clone"),
    dependencies=_perm("create"),
)
async def clone_product(
    item_id: uuid.UUID,
    payload: CloneProductRequest,
    current_user: AdminUser = Depends(require_permission("products.create")),
    service: ProductService = Depends(get_product_service),
) -> Any:
    return await service.clone(
        item_id,
        new_sku=payload.new_sku,
        new_slug=payload.new_slug,
        new_name=payload.new_name,
        actor_id=current_user.id,
    )


@router.post(
    "/{item_id}/price-rollback",
    response_model=ProductRead,
    status_code=status.HTTP_200_OK,
    summary=translate("swagger.products.price_rollback"),
    dependencies=_price_perm(),
)
async def price_rollback(
    item_id: uuid.UUID,
    payload: PriceRollbackRequest,
    current_user: AdminUser = Depends(require_permission("prices.update")),
    service: ProductService = Depends(get_product_service),
) -> Any:
    return await service.rollback_price(item_id, payload.price_history_id, current_user.id)
