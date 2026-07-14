from fastapi import APIRouter, Query, status
from pydantic import BaseModel

from app.core.i18n import SUPPORTED_LOCALES, full_catalog, translate

router = APIRouter(prefix="/i18n", tags=["i18n"])


class LocaleCatalogResponse(BaseModel):
    locale: str
    supported_locales: list[str]
    messages: dict[str, str]


@router.get(
    "/messages",
    response_model=LocaleCatalogResponse,
    status_code=status.HTTP_200_OK,
    summary=translate("swagger.i18n.messages"),
)
async def get_messages(
    lang: str = Query("ru", description=translate("swagger.filters.lang")),
) -> LocaleCatalogResponse:
    locale = lang if lang in SUPPORTED_LOCALES else "ru"
    return LocaleCatalogResponse(
        locale=locale, supported_locales=list(SUPPORTED_LOCALES), messages=full_catalog(locale)
    )
