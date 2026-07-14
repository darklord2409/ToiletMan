from app.models.catalog.product_recommendation import ProductRecommendation
from app.schemas.catalog.product_recommendation import (
    ProductRecommendationCreate,
    ProductRecommendationUpdate,
)
from app.services.base import BaseService


class ProductRecommendationService(
    BaseService[ProductRecommendation, ProductRecommendationCreate, ProductRecommendationUpdate]
):
    entity_name = "Product recommendation"
    resource = "product-recommendations"
