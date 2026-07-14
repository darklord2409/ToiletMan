from app.models.commerce.cart_item import CartItem
from app.repositories.base import BaseRepository


class CartItemRepository(BaseRepository[CartItem]):
    model = CartItem
