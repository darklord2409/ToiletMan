from typing import Any

from pydantic import BaseModel, field_validator

from app.schemas.base import TimestampedReadSchema
from app.services.translation import translations_as_dict

_TRANSLATABLE_FIELDS = ("name",)


class ProductLabelBase(BaseModel):
    code: str
    badge_color: str | None = None
    sort_order: int = 0
    is_active: bool = True


class ProductLabelCreate(ProductLabelBase):
    translations: dict[str, dict[str, Any]] | None = None


class ProductLabelUpdate(BaseModel):
    code: str | None = None
    badge_color: str | None = None
    sort_order: int | None = None
    is_active: bool | None = None
    translations: dict[str, dict[str, Any]] | None = None


class ProductLabelRead(ProductLabelBase, TimestampedReadSchema):
    translations: dict[str, dict[str, Any]] = {}

    @field_validator("translations", mode="before")
    @classmethod
    def _resolve_translations(cls, value: Any) -> dict[str, dict[str, Any]]:
        # From the API (create/update payload) this is already the target
        # dict shape; when serializing an ORM ProductLabel, `value` is
        # instead the loaded `translations` relationship (a list of
        # ProductLabelTranslation rows) that needs reshaping into
        # {locale: {...}}.
        if isinstance(value, dict):
            return value
        return translations_as_dict(value, _TRANSLATABLE_FIELDS)
