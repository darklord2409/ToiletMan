from app.models.catalog.manufacturer import Manufacturer
from app.repositories.base import BaseRepository


class ManufacturerRepository(BaseRepository[Manufacturer]):
    model = Manufacturer
