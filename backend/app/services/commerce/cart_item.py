from app.models.commerce.cart_item import CartItem
from app.schemas.commerce.cart_item import CartItemCreate, CartItemUpdate
from app.services.base import BaseService


class CartItemService(BaseService[CartItem, CartItemCreate, CartItemUpdate]):
    entity_name = "Cart item"
    resource = "cart-items"
