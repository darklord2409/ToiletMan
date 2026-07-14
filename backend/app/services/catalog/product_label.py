import uuid

from app.models.catalog.product_label import ProductLabel
from app.models.catalog.product_label_translation import ProductLabelTranslation
from app.repositories.catalog.product_label import ProductLabelRepository
from app.schemas.catalog.product_label import ProductLabelCreate, ProductLabelUpdate
from app.services.base import BaseService
from app.services.translation import upsert_translations


class ProductLabelService(BaseService[ProductLabel, ProductLabelCreate, ProductLabelUpdate]):
    entity_name = "Product label"
    resource = "product-labels"
    search_fields = ["code"]

    def __init__(self, repository: ProductLabelRepository) -> None:
        super().__init__(repository)
        self.repository: ProductLabelRepository = repository

    async def create(self, obj_in: ProductLabelCreate) -> ProductLabel:
        data = obj_in.model_dump(exclude_unset=True)
        translations = data.pop("translations", None) or {}
        obj = await self.repository.create(data)
        if translations:
            await upsert_translations(
                self.repository.session,
                translation_model=ProductLabelTranslation,
                parent_fk_field="product_label_id",
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

    async def update(self, id: uuid.UUID, obj_in: ProductLabelUpdate) -> ProductLabel:
        data = obj_in.model_dump(exclude_unset=True)
        translations = data.pop("translations", None)
        obj = await self.get(id)
        if data:
            obj = await self.repository.update(obj, data)
        if translations:
            await upsert_translations(
                self.repository.session,
                translation_model=ProductLabelTranslation,
                parent_fk_field="product_label_id",
                parent_id=obj.id,
                translations=translations,
            )
        await self.repository.session.refresh(obj, attribute_names=["translations"])
        return obj
