from typing import Any

from pydantic import BaseModel, field_validator

from app.schemas.base import TimestampedReadSchema
from app.services.translation import translations_as_dict

_TRANSLATABLE_FIELDS = ("name",)


class AttributeGroupBase(BaseModel):
    code: str
    name: str
    sort_order: int = 0


class AttributeGroupCreate(AttributeGroupBase):
    translations: dict[str, dict[str, Any]] | None = None


class AttributeGroupUpdate(BaseModel):
    code: str | None = None
    name: str | None = None
    sort_order: int | None = None
    translations: dict[str, dict[str, Any]] | None = None


class AttributeGroupRead(AttributeGroupBase, TimestampedReadSchema):
    translations: dict[str, dict[str, Any]] = {}

    @field_validator("translations", mode="before")
    @classmethod
    def _resolve_translations(cls, value: Any) -> dict[str, dict[str, Any]]:
        # From the API (create/update payload) this is already the target
        # dict shape; when serializing an ORM AttributeGroup, `value` is
        # instead the loaded `translations` relationship (a list of
        # AttributeGroupTranslation rows) that needs reshaping into
        # {locale: {...}}.
        if isinstance(value, dict):
            return value
        return translations_as_dict(value, _TRANSLATABLE_FIELDS)
