from app.models.catalog.unit import Unit
from app.schemas.catalog.unit import UnitCreate, UnitUpdate
from app.services.base import BaseService


class UnitService(BaseService[Unit, UnitCreate, UnitUpdate]):
    entity_name = "Unit"
    resource = "units"
    search_fields = ["name", "symbol"]
