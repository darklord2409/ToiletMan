from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db
from app.core.i18n import translate
from app.exceptions.base import NotFoundError
from app.repositories.content.static_page import StaticPageRepository
from app.schemas.content.static_page import StaticPageRead

router = APIRouter(prefix="/storefront", tags=["storefront-pages"])


def get_static_page_repository(session: AsyncSession = Depends(get_db)) -> StaticPageRepository:
    return StaticPageRepository(session)


@router.get(
    "/pages",
    response_model=list[StaticPageRead],
    status_code=status.HTTP_200_OK,
    summary=translate("swagger.storefront.pages"),
)
async def list_published_pages(
    repository: StaticPageRepository = Depends(get_static_page_repository),
) -> list[StaticPageRead]:
    pages, _ = await repository.list_all(filters={"is_published": True}, limit=200)
    return [StaticPageRead.model_validate(page) for page in pages]


@router.get(
    "/pages/{slug}",
    response_model=StaticPageRead,
    status_code=status.HTTP_200_OK,
    summary=translate("swagger.storefront.page_detail"),
)
async def get_published_page(
    slug: str, repository: StaticPageRepository = Depends(get_static_page_repository)
) -> StaticPageRead:
    pages, _ = await repository.list_all(filters={"slug": slug, "is_published": True}, limit=1)
    if not pages:
        raise NotFoundError(
            key="errors.not_found", params={"entity": translate("resource.static-pages")}
        )
    return StaticPageRead.model_validate(pages[0])
