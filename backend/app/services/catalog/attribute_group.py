import uuid

from app.models.catalog.attribute_group import AttributeGroup
from app.models.catalog.attribute_group_translation import AttributeGroupTranslation
from app.repositories.catalog.attribute_group import AttributeGroupRepository
from app.schemas.catalog.attribute_group import AttributeGroupCreate, AttributeGroupUpdate
from app.services.base import BaseService
from app.services.translation import upsert_translations


class AttributeGroupService(
    BaseService[AttributeGroup, AttributeGroupCreate, AttributeGroupUpdate]
):
    entity_name = "Attribute group"
    resource = "attribute-groups"
    search_fields = ["code", "name"]

    def __init__(self, repository: AttributeGroupRepository) -> None:
        super().__init__(repository)
        self.repository: AttributeGroupRepository = repository

    async def create(self, obj_in: AttributeGroupCreate) -> AttributeGroup:
        data = obj_in.model_dump(exclude_unset=True)
        translations = data.pop("translations", None) or {}
        obj = await self.repository.create(data)
        if translations:
            await upsert_translations(
                self.repository.session,
                translation_model=AttributeGroupTranslation,
                parent_fk_field="attribute_group_id",
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

    async def update(self, id: uuid.UUID, obj_in: AttributeGroupUpdate) -> AttributeGroup:
        data = obj_in.model_dump(exclude_unset=True)
        translations = data.pop("translations", None)
        obj = await self.get(id)
        if data:
            obj = await self.repository.update(obj, data)
        if translations:
            await upsert_translations(
                self.repository.session,
                translation_model=AttributeGroupTranslation,
                parent_fk_field="attribute_group_id",
                parent_id=obj.id,
                translations=translations,
            )
        await self.repository.session.refresh(obj, attribute_names=["translations"])
        return obj
