import uuid

from pydantic import BaseModel

from app.models.enums import RecommendationType
from app.schemas.base import TimestampedReadSchema


class ProductRecommendationBase(BaseModel):
    product_id: uuid.UUID
    recommended_product_id: uuid.UUID
    relation_type: RecommendationType
    sort_order: int = 0


class ProductRecommendationCreate(ProductRecommendationBase):
    pass


class ProductRecommendationUpdate(BaseModel):
    relation_type: RecommendationType | None = None
    sort_order: int | None = None


class ProductRecommendationRead(ProductRecommendationBase, TimestampedReadSchema):
    pass
