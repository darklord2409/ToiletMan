from app.models.commerce.discount import Discount
from app.repositories.base import BaseRepository


class DiscountRepository(BaseRepository[Discount]):
    model = Discount
