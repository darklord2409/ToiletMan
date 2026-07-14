import uuid
from decimal import Decimal

from pydantic import BaseModel, Field

from app.schemas.storefront.catalog import ProductSummary


class CartItemResponse(BaseModel):
    id: uuid.UUID
    product_id: uuid.UUID
    product: ProductSummary
    quantity: int
    unit_price: Decimal
    line_total: Decimal


class CartResponse(BaseModel):
    id: uuid.UUID
    items: list[CartItemResponse]
    item_count: int
    subtotal: Decimal


class AddCartItemRequest(BaseModel):
    product_id: uuid.UUID
    quantity: int = Field(default=1, ge=1)


class UpdateCartItemRequest(BaseModel):
    quantity: int = Field(ge=1)
