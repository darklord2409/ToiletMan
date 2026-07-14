from app.api.v1.crud_router import build_crud_router
from app.dependencies.factory import make_service_dependency
from app.repositories.catalog.product_type import ProductTypeRepository
from app.schemas.catalog.product_type import (
    ProductTypeCreate,
    ProductTypeRead,
    ProductTypeUpdate,
)
from app.services.catalog.product_type import ProductTypeService

get_product_type_service = make_service_dependency(ProductTypeService, ProductTypeRepository)

router = build_crud_router(
    service_dependency=get_product_type_service,
    read_schema=ProductTypeRead,
    create_schema=ProductTypeCreate,
    update_schema=ProductTypeUpdate,
    prefix="/product-types",
    tags=["product-types"],
)
