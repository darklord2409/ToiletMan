from app.models.commerce.cart import Cart
from app.repositories.base import BaseRepository


class CartRepository(BaseRepository[Cart]):
    model = Cart
