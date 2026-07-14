from app.models.catalog.product_video import ProductVideo
from app.schemas.catalog.product_video import ProductVideoCreate, ProductVideoUpdate
from app.services.base import BaseService


class ProductVideoService(BaseService[ProductVideo, ProductVideoCreate, ProductVideoUpdate]):
    entity_name = "Product video"
    resource = "product-videos"
    search_fields = ["title"]
