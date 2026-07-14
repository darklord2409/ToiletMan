from app.models.catalog.product_video import ProductVideo
from app.repositories.base import BaseRepository


class ProductVideoRepository(BaseRepository[ProductVideo]):
    model = ProductVideo
