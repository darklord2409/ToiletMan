import uuid
from decimal import Decimal
from typing import Any, Literal

from pydantic import BaseModel

from app.models.enums import ProductStatus


class BulkProductIds(BaseModel):
    product_ids: list[uuid.UUID]


class BulkStatusChange(BulkProductIds):
    status: ProductStatus


class BulkManufacturerChange(BulkProductIds):
    manufacturer_id: uuid.UUID | None = None


class BulkCategoryChange(BulkProductIds):
    category_id: uuid.UUID


class BulkCollectionChange(BulkProductIds):
    collection_id: uuid.UUID | None = None


class BulkFieldUpdate(BulkProductIds):
    fields: dict[str, Any]


class BulkPriceAdjust(BulkProductIds):
    mode: Literal["percentage", "fixed"]
    direction: Literal["increase", "decrease"]
    value: Decimal


class BulkOperationResult(BaseModel):
    updated_count: int


class CloneProductRequest(BaseModel):
    new_sku: str
    new_slug: str
    new_name: str | None = None


class PriceRollbackRequest(BaseModel):
    price_history_id: uuid.UUID


class CatalogFilterFacet(BaseModel):
    id: uuid.UUID
    name: str
    count: int


class CatalogFiltersResponse(BaseModel):
    price_min: Decimal | None = None
    price_max: Decimal | None = None
    manufacturers: list[CatalogFilterFacet] = []
    collections: list[CatalogFilterFacet] = []
    categories: list[CatalogFilterFacet] = []
