from app.api.v1.crud_router import build_crud_router
from app.dependencies.factory import make_service_dependency
from app.repositories.catalog.manufacturer import ManufacturerRepository
from app.schemas.catalog.manufacturer import (
    ManufacturerCreate,
    ManufacturerRead,
    ManufacturerUpdate,
)
from app.services.catalog.manufacturer import ManufacturerService

get_manufacturer_service = make_service_dependency(ManufacturerService, ManufacturerRepository)

router = build_crud_router(
    service_dependency=get_manufacturer_service,
    read_schema=ManufacturerRead,
    create_schema=ManufacturerCreate,
    update_schema=ManufacturerUpdate,
    prefix="/manufacturers",
    tags=["manufacturers"],
)
