"""Seed the real Product Catalog Engine reference data described in
CATALOG.md: units, reference-value dictionaries, attribute groups,
attribute definitions, attribute sets, and the ten product types from
the original spec (Kitchen Faucet, Bathroom Faucet, Sink, Mirror,
Bathroom Cabinet, Shower System, Accessory, Toilet, Outdoor Faucet,
Glass), plus one worked Manufacturer/Collection example (Grohe /
Essence). Idempotent — safe to run multiple times.

    docker compose exec backend python -m scripts.seed_catalog
"""

import asyncio

from sqlalchemy import Select, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import AsyncSessionLocal
from app.models.catalog.attribute_definition import AttributeDefinition
from app.models.catalog.attribute_definition_translation import AttributeDefinitionTranslation
from app.models.catalog.attribute_group import AttributeGroup
from app.models.catalog.attribute_group_translation import AttributeGroupTranslation
from app.models.catalog.attribute_set import AttributeSet
from app.models.catalog.attribute_set_item import AttributeSetItem
from app.models.catalog.collection import Collection
from app.models.catalog.manufacturer import Manufacturer
from app.models.catalog.product_type import ProductType
from app.models.catalog.product_type_translation import ProductTypeTranslation
from app.models.catalog.reference_value import ReferenceValue
from app.models.catalog.reference_value_translation import ReferenceValueTranslation
from app.models.catalog.unit import Unit
from app.models.enums import AttributeDataType
from app.services.translation import upsert_translations

# (symbol, name)
UNITS = [
    ("cm", "Centimeter"),
    ("mm", "Millimeter"),
    ("kg", "Kilogram"),
    ("w", "Watt"),
]

# reference_type -> [(code, ru, en, uz), ...]
REFERENCE_VALUES: dict[str, list[tuple[str, str, str, str]]] = {
    "material": [
        ("chrome", "Хром", "Chrome", "Xrom"),
        ("brass", "Латунь", "Brass", "Latun"),
        ("stainless_steel", "Нержавеющая сталь", "Stainless steel", "Zanglamaydigan po'lat"),
        ("ceramic", "Керамика", "Ceramic", "Keramika"),
        ("glass", "Стекло", "Glass", "Shisha"),
        ("acrylic", "Акрил", "Acrylic", "Akril"),
        ("mdf", "МДФ", "MDF", "MDF"),
    ],
    "color": [
        ("chrome", "Хром", "Chrome", "Xrom"),
        ("white", "Белый", "White", "Oq"),
        ("black", "Черный", "Black", "Qora"),
        ("bronze", "Бронза", "Bronze", "Bronza"),
        ("gold", "Золото", "Gold", "Oltin"),
        ("nickel", "Никель", "Nickel", "Nikel"),
    ],
    "country": [
        ("germany", "Германия", "Germany", "Germaniya"),
        ("italy", "Италия", "Italy", "Italiya"),
        ("china", "Китай", "China", "Xitoy"),
        ("turkey", "Турция", "Turkey", "Turkiya"),
        ("russia", "Россия", "Russia", "Rossiya"),
        ("uzbekistan", "Узбекистан", "Uzbekistan", "O'zbekiston"),
    ],
    "finish": [
        ("polished", "Полированный", "Polished", "Yaltiratilgan"),
        ("matte", "Матовый", "Matte", "Mat"),
        ("brushed", "Матированный (браш)", "Brushed", "Cho'tkalangan"),
    ],
    "installation_type": [
        ("wall_mounted", "Настенный монтаж", "Wall-mounted", "Devorga o'rnatiladigan"),
        ("deck_mounted", "Монтаж на столешницу", "Deck-mounted", "Stolustiga o'rnatiladigan"),
        ("floor_standing", "Напольная установка", "Floor-standing", "Polga o'rnatiladigan"),
        ("built_in", "Встраиваемый", "Built-in", "O'rnatiladigan"),
    ],
    "shape": [
        ("round", "Круглый", "Round", "Dumaloq"),
        ("square", "Квадратный", "Square", "Kvadrat"),
        ("rectangular", "Прямоугольный", "Rectangular", "To'rtburchak"),
        ("oval", "Овальный", "Oval", "Oval"),
    ],
    "warranty_period": [
        ("1y", "1 год", "1 year", "1 yil"),
        ("2y", "2 года", "2 years", "2 yil"),
        ("5y", "5 лет", "5 years", "5 yil"),
        ("10y", "10 лет", "10 years", "10 yil"),
        ("lifetime", "Пожизненная", "Lifetime", "Umrbod"),
    ],
    "connection_type": [
        ("g1_2", "G1/2", "G1/2", "G1/2"),
        ("g3_4", "G3/4", "G3/4", "G3/4"),
        ("1_2_inch", '1/2"', '1/2"', '1/2"'),
        ("3_4_inch", '3/4"', '3/4"', '3/4"'),
    ],
    "thread_size": [
        ("m10", "M10", "M10", "M10"),
        ("m12", "M12", "M12", "M12"),
        ("half_inch", '1/2"', '1/2"', '1/2"'),
        ("three_quarter_inch", '3/4"', '3/4"', '3/4"'),
    ],
    "water_outlet_type": [
        ("aerator", "Аэратор", "Aerator", "Aerator"),
        ("shower_head", "Душевая лейка", "Shower head", "Dush boshchasi"),
        ("spout", "Излив", "Spout", "Quvur uchi"),
    ],
}

# code -> (ru, en, uz)
ATTRIBUTE_GROUPS: dict[str, tuple[str, str, str]] = {
    "general": ("Общие", "General", "Umumiy"),
    "dimensions": ("Размеры", "Dimensions", "O'lchamlar"),
    "materials_finish": ("Материалы и отделка", "Materials & Finish", "Materiallar va pardoz"),
    "technical": ("Технические характеристики", "Technical", "Texnik xususiyatlar"),
    "smart_features": ("Умные функции", "Smart Features", "Aqlli funksiyalar"),
}

# code -> (data_type, unit_symbol|None, reference_type|None, group_code, ru, en, uz)
ATTRIBUTE_DEFINITIONS: dict[str, tuple[str, str | None, str | None, str, str, str, str]] = {
    "material": (
        "reference", None, "material", "materials_finish", "Материал", "Material", "Material",
    ),
    "color": ("reference", None, "color", "materials_finish", "Цвет", "Color", "Rang"),
    "country": ("reference", None, "country", "general", "Страна", "Country", "Davlat"),
    "warranty": (
        "reference", None, "warranty_period", "general", "Гарантия", "Warranty", "Kafolat",
    ),
    "finish": ("reference", None, "finish", "materials_finish", "Покрытие", "Finish", "Qoplama"),
    "installation_type": (
        "reference", None, "installation_type", "technical",
        "Тип установки", "Installation type", "O'rnatish turi",
    ),
    "connection_type": (
        "reference", None, "connection_type", "technical",
        "Тип соединения", "Connection type", "Ulanish turi",
    ),
    "thread_size": (
        "reference", None, "thread_size", "technical",
        "Размер резьбы", "Thread size", "Rezba o'lchami",
    ),
    "water_outlet_type": (
        "reference", None, "water_outlet_type", "technical",
        "Тип водовыпуска", "Water outlet type", "Suv chiqish turi",
    ),
    "aerator": (
        "reference", None, "water_outlet_type", "technical", "Аэратор", "Aerator", "Aerator",
    ),
    "shape": ("reference", None, "shape", "dimensions", "Форма", "Shape", "Shakl"),
    "height_cm": ("number", "cm", None, "dimensions", "Высота", "Height", "Balandlik"),
    "width_cm": ("number", "cm", None, "dimensions", "Ширина", "Width", "Kenglik"),
    "depth_cm": ("number", "cm", None, "dimensions", "Глубина", "Depth", "Chuqurlik"),
    "spout_length_cm": (
        "number", "cm", None, "dimensions", "Длина излива", "Spout length", "Quvur uzunligi",
    ),
    "power_w": ("number", "w", None, "smart_features", "Мощность", "Power", "Quvvat"),
    "cartridge_type": ("string", None, None, "technical", "Картридж", "Cartridge", "Kartrij"),
    "body_material": (
        "reference", None, "material", "materials_finish",
        "Материал корпуса", "Body material", "Korpus materiali",
    ),
    "front_material": (
        "reference", None, "material", "materials_finish",
        "Материал фасада", "Front material", "Old panel materiali",
    ),
    "frame_material": ("reference", None, "material", "materials_finish", "Рама", "Frame", "Rama"),
    "number_of_drawers": (
        "number", None, None, "dimensions",
        "Количество ящиков", "Number of drawers", "Tortmalar soni",
    ),
    "soft_close": (
        "boolean", None, None, "technical", "Плавное закрывание", "Soft close", "Yumshoq yopilish",
    ),
    "lighting": ("boolean", None, None, "smart_features", "Подсветка", "Lighting", "Yoritish"),
    "heating": ("boolean", None, None, "smart_features", "Подогрев", "Heating", "Isitish"),
    "sensor": ("boolean", None, None, "smart_features", "Сенсор", "Sensor", "Sensor"),
    "glass_thickness_mm": (
        "number", "mm", None, "dimensions",
        "Толщина стекла", "Glass thickness", "Shisha qalinligi",
    ),
}

# set_code -> [(attribute_code, is_required, is_visible), ...]
ATTRIBUTE_SETS: dict[str, list[tuple[str, bool, bool]]] = {
    "faucet_specs": [
        ("material", True, True),
        ("color", True, True),
        ("height_cm", False, True),
        ("spout_length_cm", False, True),
        ("installation_type", True, True),
        ("aerator", False, True),
        ("cartridge_type", False, True),
        ("warranty", False, True),
        ("country", False, True),
    ],
    "sink_specs": [
        ("material", True, True),
        ("color", False, True),
        ("shape", False, True),
        ("width_cm", False, True),
        ("depth_cm", False, True),
        ("installation_type", True, True),
        ("country", False, True),
        ("warranty", False, True),
    ],
    "mirror_specs": [
        ("width_cm", True, True),
        ("height_cm", True, True),
        ("lighting", False, True),
        ("heating", False, True),
        ("sensor", False, True),
        ("frame_material", False, True),
        ("power_w", False, True),
    ],
    "cabinet_specs": [
        ("width_cm", True, True),
        ("height_cm", True, True),
        ("depth_cm", True, True),
        ("body_material", True, True),
        ("front_material", False, True),
        ("number_of_drawers", False, True),
        ("soft_close", False, True),
    ],
    "shower_system_specs": [
        ("material", True, True),
        ("color", False, True),
        ("height_cm", False, True),
        ("connection_type", False, True),
        ("water_outlet_type", False, True),
        ("installation_type", False, True),
        ("warranty", False, True),
        ("country", False, True),
    ],
    "accessory_specs": [
        ("material", False, True),
        ("color", False, True),
        ("country", False, True),
        ("warranty", False, True),
    ],
    "toilet_specs": [
        ("material", True, True),
        ("color", False, True),
        ("shape", False, True),
        ("installation_type", True, True),
        ("water_outlet_type", False, True),
        ("country", False, True),
        ("warranty", False, True),
    ],
    "glass_specs": [
        ("material", True, True),
        ("glass_thickness_mm", False, True),
        ("color", False, True),
        ("shape", False, True),
        ("country", False, True),
    ],
}

# code -> (attribute_set_code, ru, en, uz)
PRODUCT_TYPES: dict[str, tuple[str, str, str, str]] = {
    "kitchen_faucet": (
        "faucet_specs", "Кухонный смеситель", "Kitchen Faucet", "Oshxona aralashtirgichi",
    ),
    "bathroom_faucet": (
        "faucet_specs", "Смеситель для ванной", "Bathroom Faucet", "Vannaxona aralashtirgichi",
    ),
    "sink": ("sink_specs", "Раковина", "Sink", "Rakovina"),
    "mirror": ("mirror_specs", "Зеркало", "Mirror", "Oyna"),
    "bathroom_cabinet": (
        "cabinet_specs", "Тумба для ванной", "Bathroom Cabinet", "Vannaxona tumbasi",
    ),
    "shower_system": (
        "shower_system_specs", "Душевая система", "Shower System", "Dush tizimi",
    ),
    "accessory": ("accessory_specs", "Аксессуар", "Accessory", "Aksessuar"),
    "toilet": ("toilet_specs", "Унитаз", "Toilet", "Unitaz"),
    "outdoor_faucet": (
        "faucet_specs", "Уличный смеситель", "Outdoor Faucet", "Tashqi aralashtirgich",
    ),
    "glass": (
        "glass_specs", "Стекло (душевое ограждение)", "Glass", "Shisha (dush to'sig'i)",
    ),
}


async def _get_or_create(session: AsyncSession, model: type, lookup: dict, defaults: dict):
    stmt: Select = select(model)
    for key, value in lookup.items():
        stmt = stmt.where(getattr(model, key) == value)
    existing = (await session.execute(stmt)).scalar_one_or_none()
    if existing is not None:
        return existing, False
    obj = model(**lookup, **defaults)
    session.add(obj)
    await session.flush()
    return obj, True


async def seed_units(session: AsyncSession) -> dict[str, Unit]:
    units: dict[str, Unit] = {}
    for symbol, name in UNITS:
        unit, _ = await _get_or_create(session, Unit, {"symbol": symbol}, {"name": name})
        units[symbol] = unit
    return units


async def seed_reference_values(session: AsyncSession) -> int:
    created = 0
    for reference_type, entries in REFERENCE_VALUES.items():
        for sort_order, (code, ru, en, uz) in enumerate(entries):
            value, was_created = await _get_or_create(
                session,
                ReferenceValue,
                {"reference_type": reference_type, "code": code},
                {"sort_order": sort_order},
            )
            created += int(was_created)
            # Unlike ProductType/AttributeGroup/AttributeDefinition,
            # ReferenceValue has no `name` column of its own (see
            # DATABASE.md) — every locale, including the ru default, is a
            # translation row.
            await upsert_translations(
                session,
                translation_model=ReferenceValueTranslation,
                parent_fk_field="reference_value_id",
                parent_id=value.id,
                translations={"ru": {"name": ru}, "en": {"name": en}, "uz": {"name": uz}},
            )
    return created


async def seed_attribute_groups(session: AsyncSession) -> dict[str, AttributeGroup]:
    groups: dict[str, AttributeGroup] = {}
    for sort_order, (code, (ru, en, uz)) in enumerate(ATTRIBUTE_GROUPS.items()):
        group, _ = await _get_or_create(
            session, AttributeGroup, {"code": code}, {"name": ru, "sort_order": sort_order}
        )
        await upsert_translations(
            session,
            translation_model=AttributeGroupTranslation,
            parent_fk_field="attribute_group_id",
            parent_id=group.id,
            translations={"en": {"name": en}, "uz": {"name": uz}},
        )
        groups[code] = group
    return groups


async def seed_attribute_definitions(
    session: AsyncSession, units: dict[str, Unit], groups: dict[str, AttributeGroup]
) -> dict[str, AttributeDefinition]:
    definitions: dict[str, AttributeDefinition] = {}
    for code, definition_spec in ATTRIBUTE_DEFINITIONS.items():
        data_type, unit_symbol, reference_type, group_code, ru, en, uz = definition_spec
        defn, _ = await _get_or_create(
            session,
            AttributeDefinition,
            {"code": code},
            {
                "name": ru,
                "data_type": AttributeDataType(data_type),
                "unit_id": units[unit_symbol].id if unit_symbol else None,
                "reference_type": reference_type,
                "attribute_group_id": groups[group_code].id,
                "is_filterable": reference_type is not None,
            },
        )
        await upsert_translations(
            session,
            translation_model=AttributeDefinitionTranslation,
            parent_fk_field="attribute_definition_id",
            parent_id=defn.id,
            translations={"en": {"name": en}, "uz": {"name": uz}},
        )
        definitions[code] = defn
    return definitions


async def seed_attribute_sets(
    session: AsyncSession, definitions: dict[str, AttributeDefinition]
) -> dict[str, AttributeSet]:
    sets: dict[str, AttributeSet] = {}
    for code, items in ATTRIBUTE_SETS.items():
        attribute_set, _ = await _get_or_create(
            session, AttributeSet, {"code": code}, {"name": code.replace("_", " ").title()}
        )
        existing_items = (
            (
                await session.execute(
                    select(AttributeSetItem).where(
                        AttributeSetItem.attribute_set_id == attribute_set.id
                    )
                )
            )
            .scalars()
            .all()
        )
        existing_definition_ids = {item.attribute_definition_id for item in existing_items}
        for sort_order, (attr_code, is_required, is_visible) in enumerate(items):
            definition = definitions[attr_code]
            if definition.id in existing_definition_ids:
                continue
            session.add(
                AttributeSetItem(
                    attribute_set_id=attribute_set.id,
                    attribute_definition_id=definition.id,
                    sort_order=sort_order,
                    is_required=is_required,
                    is_visible=is_visible,
                )
            )
        sets[code] = attribute_set
    await session.flush()
    return sets


async def seed_product_types(session: AsyncSession, attribute_sets: dict[str, AttributeSet]) -> int:
    created = 0
    for sort_order, (code, (set_code, ru, en, uz)) in enumerate(PRODUCT_TYPES.items()):
        product_type, was_created = await _get_or_create(
            session,
            ProductType,
            {"code": code},
            {"name": ru, "attribute_set_id": attribute_sets[set_code].id, "sort_order": sort_order},
        )
        created += int(was_created)
        await upsert_translations(
            session,
            translation_model=ProductTypeTranslation,
            parent_fk_field="product_type_id",
            parent_id=product_type.id,
            translations={"en": {"name": en}, "uz": {"name": uz}},
        )
    return created


async def seed_grohe_essence(session: AsyncSession) -> None:
    """One worked Manufacturer -> Collection example from the spec: Grohe's
    Essence collection spans faucets, mirrors, cabinets, and accessories."""
    manufacturer, _ = await _get_or_create(
        session,
        Manufacturer,
        {"slug": "grohe"},
        {"name": "Grohe", "description": "Немецкий производитель сантехники и смесителей."},
    )
    await _get_or_create(
        session,
        Collection,
        {"code": "essence"},
        {
            "manufacturer_id": manufacturer.id,
            "slug": "grohe-essence",
            "name": "Essence",
            "description": (
                "Полная линейка сантехники Grohe Essence: смесители, "
                "зеркала, тумбы и аксессуары в едином дизайне."
            ),
        },
    )


async def main() -> None:
    async with AsyncSessionLocal() as session:
        units = await seed_units(session)
        await session.flush()

        ref_created = await seed_reference_values(session)
        groups = await seed_attribute_groups(session)
        definitions = await seed_attribute_definitions(session, units, groups)
        attribute_sets = await seed_attribute_sets(session, definitions)
        types_created = await seed_product_types(session, attribute_sets)
        await seed_grohe_essence(session)

        await session.commit()
        print(
            f"Seeded {len(units)} units, {ref_created} new reference values "
            f"(across {len(REFERENCE_VALUES)} dictionaries), {len(groups)} attribute groups, "
            f"{len(definitions)} attribute definitions, {len(attribute_sets)} attribute sets, "
            f"{types_created} new product types, and the Grohe/Essence example."
        )


if __name__ == "__main__":
    asyncio.run(main())
