import uuid

from app.models.catalog.product_type import ProductType
from app.models.catalog.product_type_translation import ProductTypeTranslation
from app.repositories.catalog.product_type import ProductTypeRepository
from app.schemas.catalog.product_type import ProductTypeCreate, ProductTypeUpdate
from app.services.base import BaseService
from app.services.translation import upsert_translations


class ProductTypeService(BaseService[ProductType, ProductTypeCreate, ProductTypeUpdate]):
    entity_name = "Product type"
    resource = "product-types"
    search_fields = ["code", "name"]

    def __init__(self, repository: ProductTypeRepository) -> None:
        super().__init__(repository)
        self.repository: ProductTypeRepository = repository

    async def create(self, obj_in: ProductTypeCreate) -> ProductType:
        data = obj_in.model_dump(exclude_unset=True)
        translations = data.pop("translations", None) or {}
        obj = await self.repository.create(data)
        if translations:
            await upsert_translations(
                self.repository.session,
                translation_model=ProductTypeTranslation,
                parent_fk_field="product_type_id",
                parent_id=obj.id,
                translations=translations,
            )
        # `translations` is always in the response schema — refresh it
        # unconditionally, not just when translations were provided, or the
        # relationship is left unloaded (create) / expired-post-commit
        # (update) and response serialization crashes with a MissingGreenlet
        # error trying to lazy-load it outside the async context.
        await self.repository.session.refresh(obj, attribute_names=["translations"])
        return obj

    async def update(self, id: uuid.UUID, obj_in: ProductTypeUpdate) -> ProductType:
        data = obj_in.model_dump(exclude_unset=True)
        translations = data.pop("translations", None)
        obj = await self.get(id)
        if data:
            obj = await self.repository.update(obj, data)
        if translations:
            await upsert_translations(
                self.repository.session,
                translation_model=ProductTypeTranslation,
                parent_fk_field="product_type_id",
                parent_id=obj.id,
                translations=translations,
            )
        await self.repository.session.refresh(obj, attribute_names=["translations"])
        return obj
