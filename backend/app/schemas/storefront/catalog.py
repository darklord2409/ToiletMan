import uuid
from decimal import Decimal
from typing import Any

from pydantic import BaseModel

from app.models.enums import AttributeDataType
from app.schemas.catalog.product import ProductRead
from app.schemas.catalog.product_document import ProductDocumentRead
from app.schemas.catalog.product_image import ProductImageRead
from app.schemas.catalog.product_video import ProductVideoRead


class CategoryTreeNode(BaseModel):
    id: uuid.UUID
    name: str
    slug: str
    sort_order: int
    is_featured: bool
    image_url: str | None
    children: list["CategoryTreeNode"] = []


class ProductSummary(BaseModel):
    """Lightweight product projection shared by the cart and favorites
    responses — enough to render a line item/card without a further
    product fetch."""

    id: uuid.UUID
    sku: str
    slug: str
    name: str
    price: Decimal
    compare_at_price: Decimal | None = None
    primary_image_url: str | None = None
    availability_status: str


class ProductListItem(ProductRead):
    """`ProductRead` plus the one thumbnail a catalog grid/row needs —
    `ProductRead` itself carries no image reference (images are a separate
    per-product table), so the plain list endpoint would otherwise leave
    every storefront card without a picture."""

    primary_image_url: str | None = None


class ResolvedReferenceValue(BaseModel):
    id: uuid.UUID
    code: str
    translations: dict[str, dict[str, Any]] = {}


class ResolvedAttribute(BaseModel):
    """One product specification row, with everything needed to render it
    already resolved server-side (attribute label, unit symbol, and — for
    data_type=reference — the referenced dictionary entry's translations)
    so the Mini App doesn't have to chase attribute_definition_id/
    value_reference_id with further requests per spec row."""

    attribute_definition_id: uuid.UUID
    code: str
    name: str
    translations: dict[str, dict[str, Any]] = {}
    data_type: AttributeDataType
    unit_symbol: str | None = None
    value_string: str | None = None
    value_number: Decimal | None = None
    value_boolean: bool | None = None
    value_date: str | None = None
    reference_value: ResolvedReferenceValue | None = None


class ResolvedLabel(BaseModel):
    id: uuid.UUID
    code: str
    badge_color: str | None = None
    translations: dict[str, dict[str, Any]] = {}


class ProductRecommendations(BaseModel):
    """Five distinct recommendation rows for a product detail screen.
    `frequently_bought_together`/`accessories`/`related` are manually
    curated by admins (`ProductRecommendation` rows); `same_collection`/
    `similar` are computed on the fly from existing category/manufacturer/
    product_type columns — no admin curation needed for those two."""

    frequently_bought_together: list[ProductListItem] = []
    accessories: list[ProductListItem] = []
    related: list[ProductListItem] = []
    same_collection: list[ProductListItem] = []
    similar: list[ProductListItem] = []


class ProductDetailResponse(BaseModel):
    """Aggregates everything a product detail screen needs into one round
    trip: the product itself plus its images/documents/videos/specs/labels
    and its recommendations."""

    product: ProductRead
    images: list[ProductImageRead]
    documents: list[ProductDocumentRead]
    videos: list[ProductVideoRead]
    attributes: list[ResolvedAttribute]
    labels: list[ResolvedLabel]
    recommendations: ProductRecommendations
