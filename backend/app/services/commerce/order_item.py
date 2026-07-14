from app.models.commerce.order_item import OrderItem
from app.schemas.commerce.order_item import OrderItemCreate
from app.services.base import BaseService


class OrderItemService(BaseService[OrderItem, OrderItemCreate, OrderItemCreate]):
    """No update schema: line items are immutable once an order is placed."""

    entity_name = "Order item"
    resource = "order-items"
