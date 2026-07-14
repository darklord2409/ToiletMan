import uuid
from typing import Any

from fastapi import Query

from app.api.v1.crud_router import build_crud_router
from app.core.i18n import translate
from app.dependencies.factory import make_service_dependency
from app.repositories.catalog.product_recommendation import ProductRecommendationRepository
from app.schemas.catalog.product_recommendation import (
    ProductRecommendationCreate,
    ProductRecommendationRead,
    ProductRecommendationUpdate,
)
from app.services.catalog.product_recommendation import ProductRecommendationService

get_product_recommendation_service = make_service_dependency(
    ProductRecommendationService, ProductRecommendationRepository
)


def product_recommendation_filters(
    product_id: uuid.UUID | None = Query(None, description=translate("swagger.filters.product_id")),
) -> dict[str, Any]:
    return {"product_id": product_id}


router = build_crud_router(
    service_dependency=get_product_recommendation_service,
    read_schema=ProductRecommendationRead,
    create_schema=ProductRecommendationCreate,
    update_schema=ProductRecommendationUpdate,
    filter_dependency=product_recommendation_filters,
    prefix="/product-recommendations",
    tags=["product-recommendations"],
)
