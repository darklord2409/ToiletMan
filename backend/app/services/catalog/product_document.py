from app.models.catalog.product_document import ProductDocument
from app.schemas.catalog.product_document import ProductDocumentCreate, ProductDocumentUpdate
from app.services.base import BaseService


class ProductDocumentService(
    BaseService[ProductDocument, ProductDocumentCreate, ProductDocumentUpdate]
):
    entity_name = "Product document"
    resource = "product-documents"
    search_fields = ["title"]
