import uuid
from typing import Any

from pydantic import BaseModel, field_validator

from app.schemas.base import TimestampedReadSchema
from app.services.translation import translations_as_dict

_TRANSLATABLE_FIELDS = ("name", "description")


class CollectionBase(BaseModel):
    manufacturer_id: uuid.UUID
    code: str
    slug: str
    name: str
    description: str | None = None
    image_url: str | None = None
    sort_order: int = 0
    is_active: bool = True


class CollectionCreate(CollectionBase):
    translations: dict[str, dict[str, Any]] | None = None


class CollectionUpdate(BaseModel):
    manufacturer_id: uuid.UUID | None = None
    code: str | None = None
    slug: str | None = None
    name: str | None = None
    description: str | None = None
    image_url: str | None = None
    sort_order: int | None = None
    is_active: bool | None = None
    translations: dict[str, dict[str, Any]] | None = None


class CollectionRead(CollectionBase, TimestampedReadSchema):
    translations: dict[str, dict[str, Any]] = {}

    @field_validator("translations", mode="before")
    @classmethod
    def _resolve_translations(cls, value: Any) -> dict[str, dict[str, Any]]:
        # From the API (create/update payload) this is already the target
        # dict shape; when serializing an ORM Collection, `value` is
        # instead the loaded `translations` relationship (a list of
        # CollectionTranslation rows) that needs reshaping into
        # {locale: {...}}.
        if isinstance(value, dict):
            return value
        return translations_as_dict(value, _TRANSLATABLE_FIELDS)
