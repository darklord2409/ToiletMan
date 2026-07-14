from app.models.commerce.promotion import Promotion
from app.repositories.base import BaseRepository


class PromotionRepository(BaseRepository[Promotion]):
    model = Promotion
