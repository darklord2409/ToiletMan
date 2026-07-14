import uuid
from typing import Any

from fastapi import Query

from app.api.v1.crud_router import build_crud_router
from app.core.i18n import translate
from app.dependencies.factory import make_service_dependency
from app.repositories.catalog.collection import CollectionRepository
from app.schemas.catalog.collection import CollectionCreate, CollectionRead, CollectionUpdate
from app.services.catalog.collection import CollectionService

get_collection_service = make_service_dependency(CollectionService, CollectionRepository)


def collection_filters(
    manufacturer_id: uuid.UUID | None = Query(
        None, description=translate("swagger.filters.manufacturer_id")
    ),
) -> dict[str, Any]:
    return {"manufacturer_id": manufacturer_id}


router = build_crud_router(
    service_dependency=get_collection_service,
    read_schema=CollectionRead,
    create_schema=CollectionCreate,
    update_schema=CollectionUpdate,
    filter_dependency=collection_filters,
    prefix="/collections",
    tags=["collections"],
)
