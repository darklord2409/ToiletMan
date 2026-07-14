from app.models.catalog.manufacturer import Manufacturer
from app.schemas.catalog.manufacturer import ManufacturerCreate, ManufacturerUpdate
from app.services.base import BaseService


class ManufacturerService(BaseService[Manufacturer, ManufacturerCreate, ManufacturerUpdate]):
    entity_name = "Manufacturer"
    resource = "manufacturers"
    search_fields = ["name", "slug"]
