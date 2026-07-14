from fastapi import Query

from app.api.v1.crud_router import build_crud_router
from app.core.i18n import translate
from app.dependencies.factory import make_service_dependency
from app.repositories.content.news import NewsRepository
from app.schemas.content.news import NewsCreate, NewsRead, NewsUpdate
from app.services.content.news import NewsService

get_news_service = make_service_dependency(NewsService, NewsRepository)


def news_filters(
    is_published: bool | None = Query(None, description=translate("swagger.filters.is_published")),
) -> dict:
    return {"is_published": is_published}


router = build_crud_router(
    service_dependency=get_news_service,
    read_schema=NewsRead,
    create_schema=NewsCreate,
    update_schema=NewsUpdate,
    filter_dependency=news_filters,
    prefix="/news",
    tags=["news"],
)
