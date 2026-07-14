from app.models.catalog.product_label_assignment import ProductLabelAssignment
from app.schemas.catalog.product_label_assignment import ProductLabelAssignmentCreate
from app.services.base import BaseService


class ProductLabelAssignmentService(
    BaseService[ProductLabelAssignment, ProductLabelAssignmentCreate, ProductLabelAssignmentCreate]
):
    """No update schema: a label/product pairing is either present or
    deleted and recreated, never edited in place."""

    entity_name = "Product label assignment"
    resource = "product-label-assignments"
