from app.models.commerce.order_item import OrderItem
from app.repositories.base import BaseRepository


class OrderItemRepository(BaseRepository[OrderItem]):
    model = OrderItem
