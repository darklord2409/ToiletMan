from app.api.v1.crud_router import build_crud_router
from app.dependencies.factory import make_service_dependency
from app.repositories.content.static_page import StaticPageRepository
from app.schemas.content.static_page import StaticPageCreate, StaticPageRead, StaticPageUpdate
from app.services.content.static_page import StaticPageService

get_static_page_service = make_service_dependency(StaticPageService, StaticPageRepository)

router = build_crud_router(
    service_dependency=get_static_page_service,
    read_schema=StaticPageRead,
    create_schema=StaticPageCreate,
    update_schema=StaticPageUpdate,
    prefix="/static-pages",
    tags=["static-pages"],
)
