from app.api.v1.crud_router import build_crud_router
from app.dependencies.factory import make_service_dependency
from app.repositories.content.banner import BannerRepository
from app.schemas.content.banner import BannerCreate, BannerRead, BannerUpdate
from app.services.content.banner import BannerService

get_banner_service = make_service_dependency(BannerService, BannerRepository)

router = build_crud_router(
    service_dependency=get_banner_service,
    read_schema=BannerRead,
    create_schema=BannerCreate,
    update_schema=BannerUpdate,
    prefix="/banners",
    tags=["banners"],
)
