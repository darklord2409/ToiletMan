from app.models.content.news import News
from app.schemas.content.news import NewsCreate, NewsUpdate
from app.services.base import BaseService


class NewsService(BaseService[News, NewsCreate, NewsUpdate]):
    entity_name = "News article"
    resource = "news"
    search_fields = ["title", "excerpt", "content"]
