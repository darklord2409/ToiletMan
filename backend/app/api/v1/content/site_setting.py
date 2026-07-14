from app.api.v1.crud_router import build_crud_router
from app.dependencies.factory import make_service_dependency
from app.repositories.content.site_setting import SiteSettingRepository
from app.schemas.content.site_setting import (
    SiteSettingCreate,
    SiteSettingRead,
    SiteSettingUpdate,
)
from app.services.content.site_setting import SiteSettingService

get_site_setting_service = make_service_dependency(SiteSettingService, SiteSettingRepository)

router = build_crud_router(
    service_dependency=get_site_setting_service,
    read_schema=SiteSettingRead,
    create_schema=SiteSettingCreate,
    update_schema=SiteSettingUpdate,
    prefix="/site-settings",
    tags=["site-settings"],
)
