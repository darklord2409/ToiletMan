import uuid

from app.core.security import hash_password
from app.models.users.customer import Customer
from app.schemas.users.customer import CustomerCreate, CustomerUpdate
from app.services.base import BaseService


class CustomerService(BaseService[Customer, CustomerCreate, CustomerUpdate]):
    entity_name = "Customer"
    resource = "customers"
    search_fields = ["email", "phone", "first_name", "last_name"]

    async def create(self, obj_in: CustomerCreate) -> Customer:
        data = obj_in.model_dump(exclude_unset=True)
        if password := data.pop("password", None):
            data["hashed_password"] = hash_password(password)
        return await self.repository.create(data)

    async def update(self, id: uuid.UUID, obj_in: CustomerUpdate) -> Customer:
        data = obj_in.model_dump(exclude_unset=True)
        if password := data.pop("password", None):
            data["hashed_password"] = hash_password(password)
        db_obj = await self.get(id)
        return await self.repository.update(db_obj, data)
