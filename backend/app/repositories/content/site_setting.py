from app.models.content.site_setting import SiteSetting
from app.repositories.base import BaseRepository


class SiteSettingRepository(BaseRepository[SiteSetting]):
    model = SiteSetting
