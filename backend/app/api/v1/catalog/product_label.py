from app.api.v1.crud_router import build_crud_router
from app.dependencies.factory import make_service_dependency
from app.repositories.catalog.product_label import ProductLabelRepository
from app.schemas.catalog.product_label import (
    ProductLabelCreate,
    ProductLabelRead,
    ProductLabelUpdate,
)
from app.services.catalog.product_label import ProductLabelService

get_product_label_service = make_service_dependency(ProductLabelService, ProductLabelRepository)

router = build_crud_router(
    service_dependency=get_product_label_service,
    read_schema=ProductLabelRead,
    create_schema=ProductLabelCreate,
    update_schema=ProductLabelUpdate,
    prefix="/product-labels",
    tags=["product-labels"],
)
