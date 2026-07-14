from app.models.commerce.coupon import Coupon
from app.schemas.commerce.coupon import CouponCreate, CouponUpdate
from app.services.base import BaseService


class CouponService(BaseService[Coupon, CouponCreate, CouponUpdate]):
    entity_name = "Coupon"
    resource = "coupons"
    search_fields = ["code"]
