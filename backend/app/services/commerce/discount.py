from app.models.commerce.discount import Discount
from app.schemas.commerce.discount import DiscountCreate, DiscountUpdate
from app.services.base import BaseService


class DiscountService(BaseService[Discount, DiscountCreate, DiscountUpdate]):
    entity_name = "Discount"
    resource = "discounts"
