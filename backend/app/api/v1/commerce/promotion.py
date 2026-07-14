from app.api.v1.crud_router import build_crud_router
from app.dependencies.factory import make_service_dependency
from app.repositories.commerce.promotion import PromotionRepository
from app.schemas.commerce.promotion import PromotionCreate, PromotionRead, PromotionUpdate
from app.services.commerce.promotion import PromotionService

get_promotion_service = make_service_dependency(PromotionService, PromotionRepository)

router = build_crud_router(
    service_dependency=get_promotion_service,
    read_schema=PromotionRead,
    create_schema=PromotionCreate,
    update_schema=PromotionUpdate,
    prefix="/promotions",
    tags=["promotions"],
)
