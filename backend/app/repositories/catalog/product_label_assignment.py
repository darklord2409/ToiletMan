from app.models.catalog.product_label_assignment import ProductLabelAssignment
from app.repositories.base import BaseRepository


class ProductLabelAssignmentRepository(BaseRepository[ProductLabelAssignment]):
    model = ProductLabelAssignment
