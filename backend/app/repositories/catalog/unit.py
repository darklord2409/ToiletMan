from app.models.catalog.unit import Unit
from app.repositories.base import BaseRepository


class UnitRepository(BaseRepository[Unit]):
    model = Unit
