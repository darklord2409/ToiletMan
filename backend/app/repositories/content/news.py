from app.models.content.news import News
from app.repositories.base import BaseRepository


class NewsRepository(BaseRepository[News]):
    model = News
