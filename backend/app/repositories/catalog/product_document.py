from app.models.catalog.product_document import ProductDocument
from app.repositories.base import BaseRepository


class ProductDocumentRepository(BaseRepository[ProductDocument]):
    model = ProductDocument
