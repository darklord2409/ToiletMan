import uuid
from typing import Any

from fastapi import Query

from app.api.v1.crud_router import build_crud_router
from app.core.i18n import translate
from app.dependencies.factory import make_service_dependency
from app.repositories.catalog.category import CategoryRepository
from app.schemas.catalog.category import CategoryCreate, CategoryRead, CategoryUpdate
from app.services.catalog.category import CategoryService

get_category_service = make_service_dependency(CategoryService, CategoryRepository)


def category_filters(
    parent_id: uuid.UUID | None = Query(None, description=translate("swagger.filters.parent_id")),
) -> dict[str, Any]:
    return {"parent_id": parent_id}


router = build_crud_router(
    service_dependency=get_category_service,
    read_schema=CategoryRead,
    create_schema=CategoryCreate,
    update_schema=CategoryUpdate,
    filter_dependency=category_filters,
    prefix="/categories",
    tags=["categories"],
)
