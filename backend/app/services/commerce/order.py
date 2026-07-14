import uuid

from app.models.commerce.order import Order
from app.repositories.users.customer import CustomerRepository
from app.schemas.commerce.order import OrderCreate, OrderUpdate
from app.services.base import BaseService
from app.services.notifications import NotificationService


class OrderService(BaseService[Order, OrderCreate, OrderUpdate]):
    entity_name = "Order"
    resource = "orders"
    search_fields = ["order_number"]

    async def update(self, id: uuid.UUID, obj_in: OrderUpdate) -> Order:
        """Generic update plus one side effect the admin CRUD layer never
        had before: diff `status`/`manager_notes` and notify the customer
        on Telegram when either changes (see services/notifications.py)."""
        db_obj = await self.get(id)
        previous_status = db_obj.status
        previous_manager_notes = db_obj.manager_notes

        updated = await super().update(id, obj_in)

        customer_repo = CustomerRepository(self.repository.session)
        customer = await customer_repo.get(updated.customer_id)
        if customer is not None:
            notifications = NotificationService(self.repository.session)
            if updated.status != previous_status:
                await notifications.notify_order_status_changed(
                    customer, updated, updated.status
                )
            if updated.manager_notes and updated.manager_notes != previous_manager_notes:
                await notifications.notify_manager_contacted(customer, updated)

        return updated
