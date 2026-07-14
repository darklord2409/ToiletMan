from app.models.commerce.cart import Cart
from app.schemas.commerce.cart import CartCreate, CartUpdate
from app.services.base import BaseService


class CartService(BaseService[Cart, CartCreate, CartUpdate]):
    entity_name = "Cart"
    resource = "carts"
