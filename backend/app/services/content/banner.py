from app.models.content.banner import Banner
from app.schemas.content.banner import BannerCreate, BannerUpdate
from app.services.base import BaseService


class BannerService(BaseService[Banner, BannerCreate, BannerUpdate]):
    entity_name = "Banner"
    resource = "banners"
    search_fields = ["title"]
