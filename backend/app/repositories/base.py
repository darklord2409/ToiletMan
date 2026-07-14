from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import Any, Generic, Protocol, TypeVar, cast

from sqlalchemy import Select, asc, desc, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.base import Base

ModelType = TypeVar("ModelType", bound=Base)


class _EntityColumns(Protocol):
    """Every concrete model mixes in app.models.mixins.Entity, which adds
    id/created_at/deleted_at — but that's a runtime convention, not
    something expressible in ModelType's bound (`Base`) without forcing
    every one of the ~30 model classes onto a shared abstract subclass.
    This documents the assumption at the 3 call sites that need it,
    narrower than a blanket type: ignore."""

    id: Any
    created_at: Any
    deleted_at: Any


class BaseRepository(Generic[ModelType]):
    """Generic async CRUD repository. Every concrete repository just sets
    `model` and inherits list/get/create/update/soft_delete for free;
    entity-specific query methods can be added on the subclass."""

    model: type[ModelType]

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    def _base_query(self) -> Select[tuple[ModelType]]:
        model = cast(_EntityColumns, self.model)
        return select(self.model).where(model.deleted_at.is_(None))

    async def get(self, id: uuid.UUID) -> ModelType | None:
        model = cast(_EntityColumns, self.model)
        result = await self.session.execute(self._base_query().where(model.id == id))
        return result.scalar_one_or_none()

    async def list_all(
        self,
        *,
        offset: int = 0,
        limit: int = 20,
        filters: dict[str, Any] | None = None,
        search: str | None = None,
        search_fields: list[str] | None = None,
        sort_by: str | None = None,
        sort_order: str = "asc",
    ) -> tuple[list[ModelType], int]:
        """Named list_all, not list: a same-named method earlier in this
        class body shadows the builtin `list` for every annotation typed
        afterwards (even under `from __future__ import annotations` —
        mypy resolves the stringified annotations the same way Python's
        own runtime class-body execution would)."""
        query = self._apply_search(
            self._apply_filters(self._base_query(), filters), search, search_fields
        )

        total = (
            await self.session.execute(select(func.count()).select_from(query.subquery()))
        ).scalar_one()

        query = self._apply_sort(query, sort_by, sort_order).offset(offset).limit(limit)
        result = await self.session.execute(query)
        return list(result.scalars().all()), total

    def _apply_filters(
        self, query: Select[tuple[ModelType]], filters: dict[str, Any] | None
    ) -> Select[tuple[ModelType]]:
        if not filters:
            return query
        for field, value in filters.items():
            if value is None:
                continue
            column = getattr(self.model, field, None)
            if column is None:
                continue
            if isinstance(value, list | tuple | set):
                query = query.where(column.in_(value))
            else:
                query = query.where(column == value)
        return query

    def _apply_search(
        self,
        query: Select[tuple[ModelType]],
        search: str | None,
        search_fields: list[str] | None,
    ) -> Select[tuple[ModelType]]:
        if not search or not search_fields:
            return query
        conditions = [
            column.ilike(f"%{search}%")
            for field in search_fields
            if (column := getattr(self.model, field, None)) is not None
        ]
        return query.where(or_(*conditions)) if conditions else query

    def _apply_sort(
        self, query: Select[tuple[ModelType]], sort_by: str | None, sort_order: str
    ) -> Select[tuple[ModelType]]:
        column = getattr(self.model, sort_by, None) if sort_by else None
        if column is None:
            column = cast(_EntityColumns, self.model).created_at
        direction = desc if sort_order == "desc" else asc
        return query.order_by(direction(column))

    async def create(self, data: dict[str, Any]) -> ModelType:
        obj = self.model(**data)
        self.session.add(obj)
        await self.session.flush()
        await self.session.refresh(obj)
        return obj

    async def update(self, db_obj: ModelType, data: dict[str, Any]) -> ModelType:
        for field, value in data.items():
            setattr(db_obj, field, value)
        await self.session.flush()
        await self.session.refresh(db_obj)
        return db_obj

    async def soft_delete(self, db_obj: ModelType) -> None:
        cast(_EntityColumns, db_obj).deleted_at = datetime.now(UTC)
        await self.session.flush()
