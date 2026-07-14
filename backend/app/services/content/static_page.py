from app.models.content.static_page import StaticPage
from app.schemas.content.static_page import StaticPageCreate, StaticPageUpdate
from app.services.base import BaseService


class StaticPageService(BaseService[StaticPage, StaticPageCreate, StaticPageUpdate]):
    entity_name = "Static page"
    resource = "static-pages"
    search_fields = ["title", "content"]
