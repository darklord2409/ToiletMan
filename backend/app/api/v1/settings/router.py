from typing import Any

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db
from app.core.i18n import translate
from app.dependencies.permissions import require_permission
from app.repositories.content.store_settings import StoreSettingsRepository
from app.schemas.content.store_settings import (
    PublicStoreSettings,
    StoreSettingsRead,
    StoreSettingsUpdate,
)
from app.services.content.store_settings import StoreSettingsService

router = APIRouter(prefix="/settings", tags=["settings"])


def get_store_settings_service(session: AsyncSession = Depends(get_db)) -> StoreSettingsService:
    return StoreSettingsService(StoreSettingsRepository(session))


@router.get(
    "/public",
    response_model=PublicStoreSettings,
    status_code=status.HTTP_200_OK,
    summary=translate("swagger.settings.public"),
)
async def get_public_settings(
    service: StoreSettingsService = Depends(get_store_settings_service),
) -> PublicStoreSettings:
    settings = await service.get_or_create()
    return PublicStoreSettings.model_validate(settings)


@router.get(
    "",
    response_model=StoreSettingsRead,
    status_code=status.HTTP_200_OK,
    summary=translate("swagger.settings.get"),
    dependencies=[Depends(require_permission("settings.read"))],
)
async def get_settings(
    service: StoreSettingsService = Depends(get_store_settings_service),
) -> Any:
    return await service.get_or_create()


@router.patch(
    "",
    response_model=StoreSettingsRead,
    status_code=status.HTTP_200_OK,
    summary=translate("swagger.settings.update"),
    dependencies=[Depends(require_permission("settings.update"))],
)
async def update_settings(
    payload: StoreSettingsUpdate,
    service: StoreSettingsService = Depends(get_store_settings_service),
) -> Any:
    return await service.update(payload)
