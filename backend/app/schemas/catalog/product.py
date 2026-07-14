import uuid
from datetime import datetime
from decimal import Decimal
from typing import Any

from pydantic import BaseModel, computed_field, field_validator

from app.models.enums import ProductStatus
from app.schemas.base import TimestampedReadSchema
from app.services.translation import translations_as_dict

_TRANSLATABLE_FIELDS = ("name", "description", "meta_title", "meta_description")


class ProductBase(BaseModel):
    category_id: uuid.UUID
    manufacturer_id: uuid.UUID | None = None
    unit_id: uuid.UUID
    product_type_id: uuid.UUID
    collection_id: uuid.UUID | None = None

    sku: str
    barcode: str | None = None
    slug: str
    name: str
    description: str | None = None
    status: ProductStatus = ProductStatus.DRAFT
    is_featured: bool = False
    weight_kg: Decimal | None = None

    price: Decimal
    compare_at_price: Decimal | None = None
    cost_price: Decimal | None = None
    sale_price: Decimal | None = None
    future_price: Decimal | None = None
    future_price_activates_at: datetime | None = None
    currency: str = "UZS"

    stock_quantity: int = 0
    reserved_quantity: int = 0
    is_unlimited_stock: bool = False
    low_stock_threshold: int | None = None

    canonical_url_override: str | None = None
    seo: dict[str, Any] | None = None


class ProductCreate(ProductBase):
    translations: dict[str, dict[str, Any]] | None = None


class ProductUpdate(BaseModel):
    category_id: uuid.UUID | None = None
    manufacturer_id: uuid.UUID | None = None
    unit_id: uuid.UUID | None = None
    product_type_id: uuid.UUID | None = None
    collection_id: uuid.UUID | None = None

    sku: str | None = None
    barcode: str | None = None
    slug: str | None = None
    name: str | None = None
    description: str | None = None
    status: ProductStatus | None = None
    is_featured: bool | None = None
    weight_kg: Decimal | None = None

    price: Decimal | None = None
    compare_at_price: Decimal | None = None
    cost_price: Decimal | None = None
    sale_price: Decimal | None = None
    future_price: Decimal | None = None
    future_price_activates_at: datetime | None = None
    currency: str | None = None

    stock_quantity: int | None = None
    reserved_quantity: int | None = None
    is_unlimited_stock: bool | None = None
    low_stock_threshold: int | None = None

    canonical_url_override: str | None = None
    seo: dict[str, Any] | None = None

    translations: dict[str, dict[str, Any]] | None = None


class ProductRead(ProductBase, TimestampedReadSchema):
    translations: dict[str, dict[str, Any]] = {}

    @field_validator("translations", mode="before")
    @classmethod
    def _resolve_translations(cls, value: Any) -> dict[str, dict[str, Any]]:
        # From the API (create/update payload) this is already the target
        # dict shape; when serializing an ORM Product, `value` is instead
        # the loaded `translations` relationship (a list of
        # ProductTranslation rows) that needs reshaping into {locale: {...}}.
        if isinstance(value, dict):
            return value
        return translations_as_dict(value, _TRANSLATABLE_FIELDS)

    @computed_field  # type: ignore[prop-decorator]
    @property
    def available_quantity(self) -> int:
        if self.is_unlimited_stock:
            return self.stock_quantity
        return max(self.stock_quantity - self.reserved_quantity, 0)

    @computed_field  # type: ignore[prop-decorator]
    @property
    def availability_status(self) -> str:
        if self.is_unlimited_stock:
            return "unlimited"
        available = max(self.stock_quantity - self.reserved_quantity, 0)
        if available <= 0:
            return "out_of_stock"
        if self.low_stock_threshold is not None and available <= self.low_stock_threshold:
            return "low_stock"
        return "in_stock"
