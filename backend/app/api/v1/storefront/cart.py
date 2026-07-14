import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db
from app.core.i18n import translate
from app.dependencies.auth import get_current_customer
from app.models.users.customer import Customer
from app.schemas.storefront.cart import AddCartItemRequest, CartResponse, UpdateCartItemRequest
from app.services.storefront.cart import StorefrontCartService

router = APIRouter(prefix="/storefront/cart", tags=["storefront-cart"])


def get_storefront_cart_service(session: AsyncSession = Depends(get_db)) -> StorefrontCartService:
    return StorefrontCartService(session)


@router.get(
    "",
    response_model=CartResponse,
    status_code=status.HTTP_200_OK,
    summary=translate("swagger.storefront.cart_get"),
)
async def get_cart(
    current_customer: Customer = Depends(get_current_customer),
    service: StorefrontCartService = Depends(get_storefront_cart_service),
) -> CartResponse:
    return await service.get_cart(current_customer.id)


@router.post(
    "/items",
    response_model=CartResponse,
    status_code=status.HTTP_200_OK,
    summary=translate("swagger.storefront.cart_add_item"),
)
async def add_cart_item(
    payload: AddCartItemRequest,
    current_customer: Customer = Depends(get_current_customer),
    service: StorefrontCartService = Depends(get_storefront_cart_service),
) -> CartResponse:
    return await service.add_item(current_customer.id, payload.product_id, payload.quantity)


@router.patch(
    "/items/{item_id}",
    response_model=CartResponse,
    status_code=status.HTTP_200_OK,
    summary=translate("swagger.storefront.cart_update_item"),
)
async def update_cart_item(
    item_id: uuid.UUID,
    payload: UpdateCartItemRequest,
    current_customer: Customer = Depends(get_current_customer),
    service: StorefrontCartService = Depends(get_storefront_cart_service),
) -> CartResponse:
    return await service.update_item_quantity(current_customer.id, item_id, payload.quantity)


@router.delete(
    "/items/{item_id}",
    response_model=CartResponse,
    status_code=status.HTTP_200_OK,
    summary=translate("swagger.storefront.cart_remove_item"),
)
async def remove_cart_item(
    item_id: uuid.UUID,
    current_customer: Customer = Depends(get_current_customer),
    service: StorefrontCartService = Depends(get_storefront_cart_service),
) -> CartResponse:
    return await service.remove_item(current_customer.id, item_id)


@router.delete(
    "",
    response_model=CartResponse,
    status_code=status.HTTP_200_OK,
    summary=translate("swagger.storefront.cart_clear"),
)
async def clear_cart(
    current_customer: Customer = Depends(get_current_customer),
    service: StorefrontCartService = Depends(get_storefront_cart_service),
) -> CartResponse:
    return await service.clear_cart(current_customer.id)
