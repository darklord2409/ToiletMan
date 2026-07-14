from app.models.catalog.product_image import ProductImage
from app.schemas.catalog.product_image import ProductImageCreate, ProductImageUpdate
from app.services.base import BaseService


class ProductImageService(BaseService[ProductImage, ProductImageCreate, ProductImageUpdate]):
    entity_name = "Product image"
    resource = "product-images"
