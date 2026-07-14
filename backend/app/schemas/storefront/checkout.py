from pydantic import BaseModel, model_validator

from app.exceptions.base import BadRequestError
from app.models.enums import DeliveryMethod
from app.schemas.commerce.order import OrderRead
from app.schemas.commerce.order_item import OrderItemRead


class CheckoutRequest(BaseModel):
    contact_name: str
    contact_phone: str
    delivery_method: DeliveryMethod
    address: str | None = None
    comment: str | None = None

    @model_validator(mode="after")
    def _address_required_for_delivery(self) -> "CheckoutRequest":
        if self.delivery_method == DeliveryMethod.DELIVERY and not (self.address or "").strip():
            raise BadRequestError(key="errors.address_required_for_delivery")
        return self


class OrderDetailResponse(OrderRead):
    items: list[OrderItemRead] = []
