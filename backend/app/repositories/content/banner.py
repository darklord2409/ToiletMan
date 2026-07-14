from app.models.content.banner import Banner
from app.repositories.base import BaseRepository


class BannerRepository(BaseRepository[Banner]):
    model = Banner
