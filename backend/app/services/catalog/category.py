import uuid

from app.exceptions.base import BadRequestError
from app.models.catalog.category import Category
from app.schemas.catalog.category import CategoryCreate, CategoryUpdate
from app.services.base import BaseService


class CategoryService(BaseService[Category, CategoryCreate, CategoryUpdate]):
    entity_name = "Category"
    resource = "categories"
    search_fields = ["name", "slug"]

    async def update(self, id: uuid.UUID, obj_in: CategoryUpdate) -> Category:
        if obj_in.parent_id is not None and obj_in.parent_id == id:
            raise BadRequestError(key="errors.category_self_parent")
        return await super().update(id, obj_in)
