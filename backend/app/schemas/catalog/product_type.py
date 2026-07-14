import uuid
from typing import Any

from pydantic import BaseModel, field_validator

from app.schemas.base import TimestampedReadSchema
from app.services.translation import translations_as_dict

_TRANSLATABLE_FIELDS = ("name",)


class ProductTypeBase(BaseModel):
    attribute_set_id: uuid.UUID
    code: str
    name: str
    sort_order: int = 0
    is_active: bool = True
    default_image_url: str | None = None


class ProductTypeCreate(ProductTypeBase):
    translations: dict[str, dict[str, Any]] | None = None


class ProductTypeUpdate(BaseModel):
    attribute_set_id: uuid.UUID | None = None
    code: str | None = None
    name: str | None = None
    sort_order: int | None = None
    is_active: bool | None = None
    default_image_url: str | None = None
    translations: dict[str, dict[str, Any]] | None = None


class ProductTypeRead(ProductTypeBase, TimestampedReadSchema):
    translations: dict[str, dict[str, Any]] = {}

    @field_validator("translations", mode="before")
    @classmethod
    def _resolve_translations(cls, value: Any) -> dict[str, dict[str, Any]]:
        # From the API (create/update payload) this is already the target
        # dict shape; when serializing an ORM ProductType, `value` is
        # instead the loaded `translations` relationship (a list of
        # ProductTypeTranslation rows) that needs reshaping into
        # {locale: {...}}.
        if isinstance(value, dict):
            return value
        return translations_as_dict(value, _TRANSLATABLE_FIELDS)
