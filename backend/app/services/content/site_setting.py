from app.models.content.site_setting import SiteSetting
from app.schemas.content.site_setting import SiteSettingCreate, SiteSettingUpdate
from app.services.base import BaseService


class SiteSettingService(BaseService[SiteSetting, SiteSettingCreate, SiteSettingUpdate]):
    entity_name = "Site setting"
    resource = "site-settings"
    search_fields = ["key"]
