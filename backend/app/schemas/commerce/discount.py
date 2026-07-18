import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, model_validator

from app.exceptions.base import BadRequestError
from app.models.enums import AmountType, DiscountScope
from app.schemas.base import TimestampedReadSchema


def _check_scope_target(
    scope: DiscountScope | None,
    category_id: uuid.UUID | None,
    product_id: uuid.UUID | None,
) -> None:
    if scope == DiscountScope.CATEGORY and category_id is None:
        raise BadRequestError(key="errors.discount_category_required")
    if scope == DiscountScope.PRODUCT and product_id is None:
        raise BadRequestError(key="errors.discount_product_required")


class DiscountBase(BaseModel):
    name: str | None = None
    promotion_id: uuid.UUID | None = None
    category_id: uuid.UUID | None = None
    product_id: uuid.UUID | None = None
    scope: DiscountScope
    amount_type: AmountType
    value: Decimal
    is_active: bool = True
    starts_at: datetime | None = None
    ends_at: datetime | None = None


class DiscountCreate(DiscountBase):
    @model_validator(mode="after")
    def _validate_scope_target(self) -> "DiscountCreate":
        _check_scope_target(self.scope, self.category_id, self.product_id)
        # A discount only ever targets one thing — clear whichever field
        # doesn't match its own scope instead of trusting the caller to.
        if self.scope != DiscountScope.CATEGORY:
            self.category_id = None
        if self.scope != DiscountScope.PRODUCT:
            self.product_id = None
        return self


class DiscountUpdate(BaseModel):
    name: str | None = None
    category_id: uuid.UUID | None = None
    product_id: uuid.UUID | None = None
    scope: DiscountScope | None = None
    amount_type: AmountType | None = None
    value: Decimal | None = None
    is_active: bool | None = None
    starts_at: datetime | None = None
    ends_at: datetime | None = None

    @model_validator(mode="after")
    def _validate_scope_target(self) -> "DiscountUpdate":
        _check_scope_target(self.scope, self.category_id, self.product_id)
        return self


class DiscountRead(DiscountBase, TimestampedReadSchema):
    pass
