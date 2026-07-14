import uuid

from pydantic import BaseModel

from app.schemas.base import TimestampedReadSchema


class UploadedFileBase(BaseModel):
    uploaded_by_id: uuid.UUID | None = None
    file_name: str
    file_path: str
    mime_type: str | None = None
    size_bytes: int | None = None
    entity_type: str | None = None
    entity_id: uuid.UUID | None = None


class UploadedFileCreate(UploadedFileBase):
    pass


class UploadedFileRead(UploadedFileBase, TimestampedReadSchema):
    pass
