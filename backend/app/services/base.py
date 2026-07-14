from __future__ import annotations

import uuid
from typing import Any, Generic, TypeVar

from pydantic import BaseModel

from app.core.i18n import translate
from app.exceptions.base import NotFoundError
from app.repositories.base import BaseRepository, ModelType

CreateSchemaType = TypeVar("CreateSchemaType", bound=BaseModel)
UpdateSchemaType = TypeVar("UpdateSchemaType", bound=BaseModel)


class BaseService(Generic[ModelType, CreateSchemaType, UpdateSchemaType]):
    """Generic application service sitting between routers and
    repositories. Holds cross-cutting behavior (404 translation) so entity
    services only need to override what's actually different about them
    (uniqueness checks, derived fields, side effects).

    `resource` is the REST resource slug (e.g. "products") shared by two
    concerns: it's the localization key ("resource.products" in the i18n
    catalog) used for error messages, and it's the RBAC permission prefix
    ("products.read"/"products.create"/...) the CRUD router factory
    derives permission checks from."""

    entity_name: str = "Resource"
    resource: str = ""
    search_fields: list[str] = []

    def __init__(self, repository: BaseRepository[ModelType]) -> None:
        self.repository = repository

    def _entity_label(self) -> str:
        if self.resource:
            label = translate(f"resource.{self.resource}")
            if label != f"resource.{self.resource}":
                return label
        return self.entity_name

    async def get(self, id: uuid.UUID) -> ModelType:
        obj = await self.repository.get(id)
        if obj is None:
            raise NotFoundError(key="errors.not_found", params={"entity": self._entity_label()})
        return obj

    async def list(
        self,
        *,
        offset: int = 0,
        limit: int = 20,
        filters: dict[str, Any] | None = None,
        search: str | None = None,
        sort_by: str | None = None,
        sort_order: str = "asc",
    ) -> tuple[list[ModelType], int]:
        return await self.repository.list_all(
            offset=offset,
            limit=limit,
            filters=filters,
            search=search,
            search_fields=self.search_fields,
            sort_by=sort_by,
            sort_order=sort_order,
        )

    async def create(self, obj_in: CreateSchemaType) -> ModelType:
        return await self.repository.create(obj_in.model_dump(exclude_unset=True))

    async def update(self, id: uuid.UUID, obj_in: UpdateSchemaType) -> ModelType:
        db_obj = await self.get(id)
        return await self.repository.update(db_obj, obj_in.model_dump(exclude_unset=True))

    async def delete(self, id: uuid.UUID) -> None:
        db_obj = await self.get(id)
        await self.repository.soft_delete(db_obj)
