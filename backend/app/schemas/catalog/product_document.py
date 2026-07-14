import uuid

from pydantic import BaseModel

from app.models.enums import ProductDocumentType
from app.schemas.base import TimestampedReadSchema


class ProductDocumentBase(BaseModel):
    product_id: uuid.UUID
    document_type: ProductDocumentType
    title: str
    file_url: str
    mime_type: str | None = None
    size_bytes: int | None = None
    sort_order: int = 0


class ProductDocumentCreate(ProductDocumentBase):
    pass


class ProductDocumentUpdate(BaseModel):
    document_type: ProductDocumentType | None = None
    title: str | None = None
    file_url: str | None = None
    mime_type: str | None = None
    size_bytes: int | None = None
    sort_order: int | None = None


class ProductDocumentRead(ProductDocumentBase, TimestampedReadSchema):
    pass
