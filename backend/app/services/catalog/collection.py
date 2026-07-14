import uuid

from app.models.catalog.collection import Collection
from app.models.catalog.collection_translation import CollectionTranslation
from app.repositories.catalog.collection import CollectionRepository
from app.schemas.catalog.collection import CollectionCreate, CollectionUpdate
from app.services.base import BaseService
from app.services.translation import upsert_translations


class CollectionService(BaseService[Collection, CollectionCreate, CollectionUpdate]):
    entity_name = "Collection"
    resource = "collections"
    search_fields = ["code", "slug", "name"]

    def __init__(self, repository: CollectionRepository) -> None:
        super().__init__(repository)
        self.repository: CollectionRepository = repository

    async def create(self, obj_in: CollectionCreate) -> Collection:
        data = obj_in.model_dump(exclude_unset=True)
        translations = data.pop("translations", None) or {}
        obj = await self.repository.create(data)
        if translations:
            await upsert_translations(
                self.repository.session,
                translation_model=CollectionTranslation,
                parent_fk_field="collection_id",
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

    async def update(self, id: uuid.UUID, obj_in: CollectionUpdate) -> Collection:
        data = obj_in.model_dump(exclude_unset=True)
        translations = data.pop("translations", None)
        obj = await self.get(id)
        if data:
            obj = await self.repository.update(obj, data)
        if translations:
            await upsert_translations(
                self.repository.session,
                translation_model=CollectionTranslation,
                parent_fk_field="collection_id",
                parent_id=obj.id,
                translations=translations,
            )
        await self.repository.session.refresh(obj, attribute_names=["translations"])
        return obj
