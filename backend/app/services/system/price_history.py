from app.models.system.price_history import PriceHistory
from app.schemas.system.price_history import PriceHistoryCreate
from app.services.base import BaseService


class PriceHistoryService(BaseService[PriceHistory, PriceHistoryCreate, PriceHistoryCreate]):
    """No update schema: a historical price snapshot is never edited."""

    entity_name = "Price history entry"
    resource = "price-history"
