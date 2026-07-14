import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db
from app.core.i18n import translate
from app.dependencies.auth import get_current_customer
from app.models.users.customer import Customer
from app.schemas.storefront.favorites import AddFavoriteRequest, FavoriteResponse
from app.services.storefront.favorites import StorefrontFavoritesService

router = APIRouter(prefix="/storefront/favorites", tags=["storefront-favorites"])


def get_storefront_favorites_service(
    session: AsyncSession = Depends(get_db),
) -> StorefrontFavoritesService:
    return StorefrontFavoritesService(session)


@router.get(
    "",
    response_model=list[FavoriteResponse],
    status_code=status.HTTP_200_OK,
    summary=translate("swagger.storefront.favorites_list"),
)
async def list_favorites(
    current_customer: Customer = Depends(get_current_customer),
    service: StorefrontFavoritesService = Depends(get_storefront_favorites_service),
) -> list[FavoriteResponse]:
    return await service.list_favorites(current_customer.id)


@router.post(
    "",
    response_model=FavoriteResponse,
    status_code=status.HTTP_201_CREATED,
    summary=translate("swagger.storefront.favorites_add"),
)
async def add_favorite(
    payload: AddFavoriteRequest,
    current_customer: Customer = Depends(get_current_customer),
    service: StorefrontFavoritesService = Depends(get_storefront_favorites_service),
) -> FavoriteResponse:
    return await service.add_favorite(current_customer.id, payload.product_id)


@router.delete(
    "/{product_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary=translate("swagger.storefront.favorites_remove"),
)
async def remove_favorite(
    product_id: uuid.UUID,
    current_customer: Customer = Depends(get_current_customer),
    service: StorefrontFavoritesService = Depends(get_storefront_favorites_service),
) -> None:
    await service.remove_favorite(current_customer.id, product_id)
