from app.models.catalog.product_recommendation import ProductRecommendation
from app.repositories.base import BaseRepository


class ProductRecommendationRepository(BaseRepository[ProductRecommendation]):
    model = ProductRecommendation
