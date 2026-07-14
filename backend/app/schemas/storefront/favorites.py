import uuid
from datetime import datetime

from pydantic import BaseModel

from app.schemas.storefront.catalog import ProductSummary


class FavoriteResponse(BaseModel):
    id: uuid.UUID
    product: ProductSummary
    created_at: datetime


class AddFavoriteRequest(BaseModel):
    product_id: uuid.UUID
