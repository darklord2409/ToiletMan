import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db
from app.core.i18n import translate
from app.dependencies.auth import get_current_customer
from app.dependencies.pagination import PaginationParams, pagination_params
from app.models.users.customer import Customer
from app.schemas.base import PaginatedResponse, PaginationMeta
from app.schemas.commerce.order import OrderRead
from app.schemas.storefront.checkout import CheckoutRequest, OrderDetailResponse
from app.services.storefront.checkout import StorefrontCheckoutService

router = APIRouter(prefix="/storefront", tags=["storefront-checkout"])


def get_storefront_checkout_service(
    session: AsyncSession = Depends(get_db),
) -> StorefrontCheckoutService:
    return StorefrontCheckoutService(session)


@router.post(
    "/checkout",
    response_model=OrderDetailResponse,
    status_code=status.HTTP_201_CREATED,
    summary=translate("swagger.storefront.checkout"),
)
async def checkout(
    payload: CheckoutRequest,
    current_customer: Customer = Depends(get_current_customer),
    service: StorefrontCheckoutService = Depends(get_storefront_checkout_service),
) -> OrderDetailResponse:
    return await service.checkout(current_customer.id, payload)


@router.get(
    "/orders",
    response_model=PaginatedResponse[OrderRead],
    status_code=status.HTTP_200_OK,
    summary=translate("swagger.storefront.orders_list"),
)
async def list_my_orders(
    pagination: PaginationParams = Depends(pagination_params),
    current_customer: Customer = Depends(get_current_customer),
    service: StorefrontCheckoutService = Depends(get_storefront_checkout_service),
) -> PaginatedResponse:
    items, total = await service.list_my_orders(
        current_customer.id, offset=pagination.offset, limit=pagination.limit
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
    "/orders/{order_id}",
    response_model=OrderDetailResponse,
    status_code=status.HTTP_200_OK,
    summary=translate("swagger.storefront.order_detail"),
)
async def get_my_order(
    order_id: uuid.UUID,
    current_customer: Customer = Depends(get_current_customer),
    service: StorefrontCheckoutService = Depends(get_storefront_checkout_service),
) -> OrderDetailResponse:
    return await service.get_my_order(current_customer.id, order_id)
