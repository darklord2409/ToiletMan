from fastapi import APIRouter, Depends, Request, status
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db, get_redis
from app.core.i18n import translate
from app.core.rate_limit import rate_limit
from app.dependencies.auth import get_current_customer
from app.models.users.customer import Customer
from app.schemas.auth import (
    CustomerEmailLoginRequest,
    CustomerPhoneLoginRequest,
    CustomerProfileUpdateRequest,
    CustomerRegisterRequest,
    CustomerTelegramLoginRequest,
    LanguagePreference,
    LogoutRequest,
    RefreshRequest,
    TokenResponse,
)
from app.schemas.users.customer import CustomerRead
from app.services.customer_auth import CustomerAuthService

router = APIRouter(prefix="/customer-auth", tags=["customer-auth"])


def get_customer_auth_service(
    session: AsyncSession = Depends(get_db), redis: Redis = Depends(get_redis)
) -> CustomerAuthService:
    return CustomerAuthService(session, redis)


def _client_ip(request: Request) -> str | None:
    return request.client.host if request.client else None


@router.post(
    "/register",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
    summary=translate("swagger.customer_auth.register"),
    dependencies=[Depends(rate_limit("customer-register", 5, 60))],
)
async def register(
    request: Request,
    payload: CustomerRegisterRequest,
    service: CustomerAuthService = Depends(get_customer_auth_service),
) -> TokenResponse:
    return await service.register(
        payload.email, payload.password, payload.first_name, payload.last_name, _client_ip(request)
    )


@router.post(
    "/login",
    response_model=TokenResponse,
    status_code=status.HTTP_200_OK,
    summary=translate("swagger.customer_auth.login"),
    dependencies=[Depends(rate_limit("customer-login", 5, 60))],
)
async def login(
    request: Request,
    payload: CustomerEmailLoginRequest,
    service: CustomerAuthService = Depends(get_customer_auth_service),
) -> TokenResponse:
    return await service.login_with_email(payload.email, payload.password, _client_ip(request))


@router.post(
    "/login/phone",
    response_model=TokenResponse,
    status_code=status.HTTP_200_OK,
    summary=translate("swagger.customer_auth.login_phone"),
    dependencies=[Depends(rate_limit("customer-login-phone", 5, 60))],
)
async def login_phone(
    request: Request,
    payload: CustomerPhoneLoginRequest,
    service: CustomerAuthService = Depends(get_customer_auth_service),
) -> TokenResponse:
    return await service.login_with_phone(payload.phone, payload.password, _client_ip(request))


@router.post(
    "/telegram",
    response_model=TokenResponse,
    status_code=status.HTTP_200_OK,
    summary=translate("swagger.customer_auth.telegram"),
    dependencies=[Depends(rate_limit("customer-telegram", 20, 60))],
)
async def telegram_login(
    request: Request,
    payload: CustomerTelegramLoginRequest,
    service: CustomerAuthService = Depends(get_customer_auth_service),
) -> TokenResponse:
    return await service.login_with_telegram(payload.init_data, _client_ip(request))


@router.post(
    "/refresh",
    response_model=TokenResponse,
    status_code=status.HTTP_200_OK,
    summary=translate("swagger.customer_auth.refresh"),
    dependencies=[Depends(rate_limit("customer-refresh", 30, 60))],
)
async def refresh(
    payload: RefreshRequest, service: CustomerAuthService = Depends(get_customer_auth_service)
) -> TokenResponse:
    return await service.refresh(payload.refresh_token)


@router.post(
    "/logout",
    status_code=status.HTTP_204_NO_CONTENT,
    summary=translate("swagger.customer_auth.logout"),
)
async def logout(
    request: Request,
    payload: LogoutRequest,
    current_customer: Customer = Depends(get_current_customer),
    service: CustomerAuthService = Depends(get_customer_auth_service),
) -> None:
    await service.logout(payload.refresh_token, current_customer.id, _client_ip(request))


@router.get(
    "/me",
    response_model=CustomerRead,
    status_code=status.HTTP_200_OK,
    summary=translate("swagger.customer_auth.me"),
)
async def me(current_customer: Customer = Depends(get_current_customer)) -> Customer:
    return current_customer


@router.patch(
    "/me/language",
    response_model=CustomerRead,
    status_code=status.HTTP_200_OK,
    summary=translate("swagger.customer_auth.update_language"),
)
async def update_my_language(
    payload: LanguagePreference,
    current_customer: Customer = Depends(get_current_customer),
    session: AsyncSession = Depends(get_db),
) -> Customer:
    current_customer.language = payload.language
    await session.commit()
    await session.refresh(current_customer)
    return current_customer


@router.patch(
    "/me",
    response_model=CustomerRead,
    status_code=status.HTTP_200_OK,
    summary=translate("swagger.customer_auth.update_profile"),
)
async def update_my_profile(
    payload: CustomerProfileUpdateRequest,
    current_customer: Customer = Depends(get_current_customer),
    session: AsyncSession = Depends(get_db),
) -> Customer:
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(current_customer, field, value)
    await session.commit()
    await session.refresh(current_customer)
    return current_customer
