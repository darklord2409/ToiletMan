from app.models.catalog.product_attribute import ProductAttribute
from app.schemas.catalog.product_attribute import ProductAttributeCreate, ProductAttributeUpdate
from app.services.base import BaseService


class ProductAttributeService(
    BaseService[ProductAttribute, ProductAttributeCreate, ProductAttributeUpdate]
):
    entity_name = "Product attribute"
    resource = "product-attributes"
