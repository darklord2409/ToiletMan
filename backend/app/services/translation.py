import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.i18n import SUPPORTED_LOCALES
from app.exceptions.base import BadRequestError


async def upsert_translations(
    session: AsyncSession,
    *,
    translation_model: type[Any],
    parent_fk_field: str,
    parent_id: uuid.UUID,
    translations: dict[str, dict[str, Any]],
) -> None:
    """Generic upsert for any `{entity}_translations` table: one row per
    (parent, locale). Every translatable catalog entity (Product,
    ProductType, AttributeDefinition, AttributeGroup, Collection,
    ProductLabel, ReferenceValue) shares this instead of each
    re-implementing the same upsert-by-locale logic."""
    for locale, fields in translations.items():
        if locale not in SUPPORTED_LOCALES:
            raise BadRequestError(key="errors.unsupported_language", params={"language": locale})

        stmt = select(translation_model).where(
            getattr(translation_model, parent_fk_field) == parent_id,
            translation_model.locale == locale,
        )
        existing = (await session.execute(stmt)).scalar_one_or_none()
        if existing is not None:
            for key, value in fields.items():
                setattr(existing, key, value)
        else:
            session.add(
                translation_model(**{parent_fk_field: parent_id, "locale": locale, **fields})
            )
    await session.flush()


def translated_field(translations: list[Any], locale: str, field: str, fallback: Any = None) -> Any:
    """Reads one field from an already-loaded list of translation rows for
    `locale`, falling back to `fallback` (typically the parent's own
    base-locale column) if no override row exists or the value is null."""
    for row in translations:
        if row.locale == locale:
            value = getattr(row, field)
            if value is not None:
                return value
    return fallback


def translations_as_dict(
    translations: list[Any], fields: tuple[str, ...]
) -> dict[str, dict[str, Any]]:
    """Reshapes a loaded list of translation rows into {locale: {field: value}}
    for exposing every locale's overrides at once (e.g. to an admin edit form)."""
    return {row.locale: {field: getattr(row, field) for field in fields} for row in translations}
