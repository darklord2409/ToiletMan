import uuid
from datetime import datetime
from typing import Generic, TypeVar

from pydantic import BaseModel, ConfigDict

T = TypeVar("T")


class ORMSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class TimestampedReadSchema(ORMSchema):
    # Mix into every *Read schema so API responses expose the standard
    # audit columns every table carries (see app.models.mixins.Entity).
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime


class PaginationMeta(BaseModel):
    page: int
    page_size: int
    total_items: int
    total_pages: int


class PaginatedResponse(BaseModel, Generic[T]):
    items: list[T]
    meta: PaginationMeta
