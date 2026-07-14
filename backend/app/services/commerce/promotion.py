from app.models.commerce.promotion import Promotion
from app.schemas.commerce.promotion import PromotionCreate, PromotionUpdate
from app.services.base import BaseService


class PromotionService(BaseService[Promotion, PromotionCreate, PromotionUpdate]):
    entity_name = "Promotion"
    resource = "promotions"
    search_fields = ["name"]
