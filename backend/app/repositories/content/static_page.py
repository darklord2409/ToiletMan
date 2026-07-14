from app.models.content.static_page import StaticPage
from app.repositories.base import BaseRepository


class StaticPageRepository(BaseRepository[StaticPage]):
    model = StaticPage
