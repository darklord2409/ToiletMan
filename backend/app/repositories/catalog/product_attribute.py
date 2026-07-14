from app.models.catalog.product_attribute import ProductAttribute
from app.repositories.base import BaseRepository


class ProductAttributeRepository(BaseRepository[ProductAttribute]):
    model = ProductAttribute
