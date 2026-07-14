import uuid
from decimal import Decimal
from typing import Any

from pydantic import BaseModel, field_validator

from app.models.enums import AttributeDataType
from app.schemas.base import TimestampedReadSchema
from app.services.translation import translations_as_dict

_TRANSLATABLE_FIELDS = ("name",)


class AttributeDefinitionBase(BaseModel):
    unit_id: uuid.UUID | None = None
    attribute_group_id: uuid.UUID | None = None
    code: str
    name: str
    data_type: AttributeDataType
    reference_type: str | None = None
    is_filterable: bool = False
    validation_regex: str | None = None
    min_value: Decimal | None = None
    max_value: Decimal | None = None


class AttributeDefinitionCreate(AttributeDefinitionBase):
    translations: dict[str, dict[str, Any]] | None = None


class AttributeDefinitionUpdate(BaseModel):
    unit_id: uuid.UUID | None = None
    attribute_group_id: uuid.UUID | None = None
    code: str | None = None
    name: str | None = None
    data_type: AttributeDataType | None = None
    reference_type: str | None = None
    is_filterable: bool | None = None
    validation_regex: str | None = None
    min_value: Decimal | None = None
    max_value: Decimal | None = None
    translations: dict[str, dict[str, Any]] | None = None


class AttributeDefinitionRead(AttributeDefinitionBase, TimestampedReadSchema):
    translations: dict[str, dict[str, Any]] = {}

    @field_validator("translations", mode="before")
    @classmethod
    def _resolve_translations(cls, value: Any) -> dict[str, dict[str, Any]]:
        # From the API (create/update payload) this is already the target
        # dict shape; when serializing an ORM AttributeDefinition, `value`
        # is instead the loaded `translations` relationship (a list of
        # AttributeDefinitionTranslation rows) that needs reshaping into
        # {locale: {...}}.
        if isinstance(value, dict):
            return value
        return translations_as_dict(value, _TRANSLATABLE_FIELDS)
