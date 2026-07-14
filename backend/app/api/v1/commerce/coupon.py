from app.api.v1.crud_router import build_crud_router
from app.dependencies.factory import make_service_dependency
from app.repositories.commerce.coupon import CouponRepository
from app.schemas.commerce.coupon import CouponCreate, CouponRead, CouponUpdate
from app.services.commerce.coupon import CouponService

get_coupon_service = make_service_dependency(CouponService, CouponRepository)

router = build_crud_router(
    service_dependency=get_coupon_service,
    read_schema=CouponRead,
    create_schema=CouponCreate,
    update_schema=CouponUpdate,
    prefix="/coupons",
    tags=["coupons"],
)
