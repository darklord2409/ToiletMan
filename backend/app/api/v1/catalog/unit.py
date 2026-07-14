from app.api.v1.crud_router import build_crud_router
from app.dependencies.factory import make_service_dependency
from app.repositories.catalog.unit import UnitRepository
from app.schemas.catalog.unit import UnitCreate, UnitRead, UnitUpdate
from app.services.catalog.unit import UnitService

get_unit_service = make_service_dependency(UnitService, UnitRepository)

router = build_crud_router(
    service_dependency=get_unit_service,
    read_schema=UnitRead,
    create_schema=UnitCreate,
    update_schema=UnitUpdate,
    prefix="/units",
    tags=["units"],
)
