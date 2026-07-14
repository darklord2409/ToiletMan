import uuid
from collections.abc import Callable, Sequence
from typing import Any

from fastapi import APIRouter, Depends, Query, status

from app.core.i18n import translate
from app.dependencies.pagination import PaginationParams, pagination_params
from app.dependencies.permissions import require_permission
from app.schemas.base import PaginatedResponse, PaginationMeta


def _no_filters() -> dict[str, Any]:
    return {}


def build_crud_router(
    *,
    service_dependency: Callable[..., Any],
    read_schema: type,
    create_schema: type | None = None,
    update_schema: type | None = None,
    allow_delete: bool = True,
    filter_dependency: Callable[..., dict[str, Any]] | None = None,
    prefix: str,
    tags: Sequence[str],
    resource: str | None = None,
    enforce_permissions: bool = True,
) -> APIRouter:
    """Wires up the standard list/get/create/update/delete endpoints for a
    single entity on top of BaseService, so each entity's router module
    only has to declare its schemas and any endpoints beyond plain CRUD.

    Every route is also wired to a permission check derived from the
    resource slug (defaults to the URL prefix): GET -> "<resource>.read",
    POST -> "<resource>.create", PATCH -> "<resource>.update",
    DELETE -> "<resource>.delete". A Super Admin always bypasses this."""

    router = APIRouter(prefix=prefix, tags=list(tags))
    get_filters = filter_dependency or _no_filters
    resource_slug = resource or prefix.lstrip("/")

    # Swagger text below is only the *default-locale* fallback, baked in at
    # route-registration time (no request context exists yet, so this
    # always resolves to DEFAULT_LOCALE). The actual per-request language
    # served in /docs comes from app/core/openapi_i18n.py, which re-derives
    # these same summaries from (method, path shape, tag) at request time —
    # this string is never seen by anyone using the localized docs.
    resource_label = translate(f"resource.{resource_slug}")

    def _permission_deps(action: str) -> list[Any]:
        if not enforce_permissions:
            return []
        return [Depends(require_permission(f"{resource_slug}.{action}"))]

    # read_schema/create_schema/update_schema are real Pydantic model
    # classes at decoration time (eager annotation evaluation, one real
    # class per build_crud_router(...) call) — that's what makes FastAPI's
    # automatic request/response validation work per entity. mypy can't
    # verify a runtime `type` variable as a static type argument; `Any`
    # here would silently disable validation for all 26 CRUD routers.
    @router.get(
        "",
        response_model=PaginatedResponse[read_schema],  # type: ignore[valid-type]
        status_code=status.HTTP_200_OK,
        summary=translate("swagger.list_summary", resource=resource_label),
        dependencies=_permission_deps("read"),
    )
    async def list_items(
        pagination: PaginationParams = Depends(pagination_params),
        sort_by: str | None = Query(None, description=translate("swagger.filters.sort_by")),
        sort_order: str = Query(
            "asc", pattern="^(asc|desc)$", description=translate("swagger.filters.sort_order")
        ),
        search: str | None = Query(None, description=translate("swagger.filters.search")),
        filters: dict[str, Any] = Depends(get_filters),
        service: Any = Depends(service_dependency),
    ) -> PaginatedResponse:
        items, total = await service.list(
            offset=pagination.offset,
            limit=pagination.limit,
            filters=filters,
            search=search,
            sort_by=sort_by,
            sort_order=sort_order,
        )
        total_pages = (total + pagination.page_size - 1) // pagination.page_size if total else 0
        return PaginatedResponse(
            items=items,
            meta=PaginationMeta(
                page=pagination.page,
                page_size=pagination.page_size,
                total_items=total,
                total_pages=total_pages,
            ),
        )

    @router.get(
        "/{item_id}",
        response_model=read_schema,
        status_code=status.HTTP_200_OK,
        summary=translate("swagger.get_summary", resource=resource_label),
        dependencies=_permission_deps("read"),
    )
    async def get_item(item_id: uuid.UUID, service: Any = Depends(service_dependency)) -> Any:
        return await service.get(item_id)

    if create_schema is not None:

        @router.post(
            "",
            response_model=read_schema,
            status_code=status.HTTP_201_CREATED,
            summary=translate("swagger.create_summary", resource=resource_label),
            dependencies=_permission_deps("create"),
        )
        async def create_item(
            payload: create_schema,  # type: ignore[valid-type]
            service: Any = Depends(service_dependency),
        ) -> Any:
            return await service.create(payload)

    if update_schema is not None:

        @router.patch(
            "/{item_id}",
            response_model=read_schema,
            status_code=status.HTTP_200_OK,
            summary=translate("swagger.update_summary", resource=resource_label),
            dependencies=_permission_deps("update"),
        )
        async def update_item(
            item_id: uuid.UUID,
            payload: update_schema,  # type: ignore[valid-type]
            service: Any = Depends(service_dependency),
        ) -> Any:
            return await service.update(item_id, payload)

    if allow_delete:

        @router.delete(
            "/{item_id}",
            status_code=status.HTTP_204_NO_CONTENT,
            summary=translate("swagger.delete_summary", resource=resource_label),
            dependencies=_permission_deps("delete"),
        )
        async def delete_item(
            item_id: uuid.UUID, service: Any = Depends(service_dependency)
        ) -> None:
            await service.delete(item_id)

    return router
