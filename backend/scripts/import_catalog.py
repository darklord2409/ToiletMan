import json
import re
import unicodedata

import httpx

BASE = "http://localhost:8000/api/v1"
DATA_JSON = "/tmp/catalog_data.json"

USD_TO_UZS = 12700

GENERAL_ATTRIBUTE_SET_ID = "2941e851-87f2-4048-9e43-8fa873a476a6"
PCS_UNIT_ID = "98786b3f-9f5b-431f-862f-404dee1bdeca"

# raw (normalized) category text from the PDF -> (parent key, RU child category
# name, product_type code)
CATEGORY_MAP = {
    "сенсорный смеситель": ("faucets", "Сенсорные смесители", "sensor_faucet"),
    "смесители для раковины": ("faucets", "Смесители для раковины", "basin_faucet"),
    "смесители для ванны": ("faucets", "Смесители для ванны", "bathroom_faucet"),
    "смеситель для унитаза": ("faucets", "Гигиенический душ", "hygienic_shower"),
    "смесители для кухни": ("faucets", "Смесители для кухни", "kitchen_faucet"),
    "смеситель для биде": ("faucets", "Смесители для биде", "basin_faucet"),
    "душевой набор": ("plumbing", "Душевые системы", "shower_system"),
    "шаттаф набор": ("plumbing", "Душевые системы", "shower_system"),
    "подвесной унитаз": ("plumbing", "Подвесные унитазы", "toilet"),
    "умный туалет": ("plumbing", "Умные унитазы", "toilet"),
    "керамическая раковина": ("plumbing", "Керамические раковины", "sink"),
    "раковина для мытья ног": ("plumbing", "Раковины для мытья ног", "sink"),
    "фильтр": ("accessories", "Фильтры", "filter"),
    "угловой клапан": ("accessories", "Угловые краны", "angle_valve"),
    "скобяные изделия": ("accessories", "Скобяные изделия", "accessory"),
    "сушилка для рук": ("accessories", "Сушилки для рук", "hand_dryer"),
    "стоки": ("accessories", "Сливы и трапы", "drain"),
    "аксессуары для смесителей": ("accessories", "Аксессуары для смесителей", "accessory"),
}

PARENTS = {
    "faucets": "Смесители",
    "plumbing": "Душевые системы и сантехника",
    "accessories": "Фурнитура и аксессуары",
}

NEW_PRODUCT_TYPES = {
    # code: RU name
    "sensor_faucet": "Сенсорный смеситель",
    "basin_faucet": "Смеситель для раковины",
    "hygienic_shower": "Гигиенический душ",
    "filter": "Фильтр",
    "angle_valve": "Угловой клапан",
    "hand_dryer": "Сушилка для рук",
    "drain": "Слив/трап",
}

CATEGORY_NAME_LABELS = {
    "сенсорный смеситель": "Сенсорный смеситель",
    "смесители для раковины": "Смеситель для раковины",
    "смесители для ванны": "Смеситель для ванны",
    "смеситель для унитаза": "Гигиенический душ",
    "смесители для кухни": "Смеситель для кухни",
    "смеситель для биде": "Смеситель для биде",
    "душевой набор": "Душевой набор",
    "шаттаф набор": "Шаттаф набор",
    "подвесной унитаз": "Подвесной унитаз",
    "умный туалет": "Умный унитаз",
    "керамическая раковина": "Керамическая раковина",
    "раковина для мытья ног": "Раковина для мытья ног",
    "фильтр": "Фильтр",
    "угловой клапан": "Угловой кран",
    "скобяные изделия": "Аксессуар для ванной",
    "сушилка для рук": "Сушилка для рук",
    "стоки": "Слив для пола",
    "аксессуары для смесителей": "Аксессуар для смесителя",
}


def normalize_category(raw: str) -> str:
    s = re.sub(r"\s+", " ", raw.replace("\n", " ")).strip().lower()
    return s


_CYRILLIC_TO_LATIN = {
    "а": "a", "б": "b", "в": "v", "г": "g", "д": "d", "е": "e", "ё": "e",
    "ж": "zh", "з": "z", "и": "i", "й": "y", "к": "k", "л": "l", "м": "m",
    "н": "n", "о": "o", "п": "p", "р": "r", "с": "s", "т": "t", "у": "u",
    "ф": "f", "х": "h", "ц": "ts", "ч": "ch", "ш": "sh", "щ": "sch",
    "ъ": "", "ы": "y", "ь": "", "э": "e", "ю": "yu", "я": "ya",
}


def slugify(text: str) -> str:
    text = text.lower()
    text = "".join(_CYRILLIC_TO_LATIN.get(ch, ch) for ch in text)
    text = unicodedata.normalize("NFKD", text)
    text = re.sub(r"[^a-zA-Z0-9]+", "-", text).strip("-").lower()
    return text or "item"


def clean_description(desc: str) -> str:
    # "1.foo 2.bar 3.baz" -> one bullet per line
    parts = re.split(r"(?=\d+\.)", desc)
    lines = [p.strip() for p in parts if p.strip()]
    return "\n".join(lines)


def main() -> None:
    client = httpx.Client(base_url=BASE, timeout=30.0)

    resp = client.post(
        "/auth/login",
        data={"username": "playwright_e2e", "password": "PlaywrightE2E!2026"},
    )
    resp.raise_for_status()
    token = resp.json()["access_token"]
    client.headers["Authorization"] = f"Bearer {token}"

    # 1. Manufacturers
    manufacturer_ids: dict[str, str] = {}
    for brand in ("BOOYEA", "PLATO", "UMAX"):
        r = client.post(
            "/manufacturers",
            json={"name": brand, "slug": slugify(brand), "is_active": True},
        )
        r.raise_for_status()
        manufacturer_ids[brand] = r.json()["id"]
        print("manufacturer", brand, manufacturer_ids[brand])

    # 2. Parent categories
    parent_ids: dict[str, str] = {}
    for i, (key, name) in enumerate(PARENTS.items()):
        r = client.post(
            "/categories",
            json={"name": name, "slug": slugify(name), "sort_order": i, "is_active": True},
        )
        r.raise_for_status()
        parent_ids[key] = r.json()["id"]
        print("parent category", name, parent_ids[key])

    # 3. Child categories (dedup by (parent_key, child_name))
    child_category_ids: dict[tuple[str, str], str] = {}
    sort_counters: dict[str, int] = {}
    for _norm_cat, (parent_key, child_name, _pt) in CATEGORY_MAP.items():
        key = (parent_key, child_name)
        if key in child_category_ids:
            continue
        sort_counters[parent_key] = sort_counters.get(parent_key, 0) + 1
        r = client.post(
            "/categories",
            json={
                "name": child_name,
                "slug": slugify(f"{parent_key}-{child_name}"),
                "parent_id": parent_ids[parent_key],
                "sort_order": sort_counters[parent_key],
                "is_active": True,
            },
        )
        r.raise_for_status()
        child_category_ids[key] = r.json()["id"]
        print("child category", child_name, child_category_ids[key])

    # 4. Product types: reuse existing where possible, create new ones.
    r = client.get("/product-types", params={"page_size": 100})
    r.raise_for_status()
    existing_types = {row["code"]: row["id"] for row in r.json()["items"]}

    product_type_ids: dict[str, str] = dict(existing_types)
    for code, name in NEW_PRODUCT_TYPES.items():
        if code in product_type_ids:
            continue
        r = client.post(
            "/product-types",
            json={
                "code": code,
                "name": name,
                "attribute_set_id": GENERAL_ATTRIBUTE_SET_ID,
                "is_active": True,
            },
        )
        r.raise_for_status()
        product_type_ids[code] = r.json()["id"]
        print("product type", code, product_type_ids[code])

    # Persist the mapping for the next script (image upload + product creation).
    with open("/tmp/catalog_ids.json", "w", encoding="utf-8") as f:
        json.dump(
            {
                "manufacturer_ids": manufacturer_ids,
                "child_category_ids": {f"{k[0]}|{k[1]}": v for k, v in child_category_ids.items()},
                "product_type_ids": product_type_ids,
            },
            f,
            ensure_ascii=False,
            indent=2,
        )
    print("Wrote /tmp/catalog_ids.json")


if __name__ == "__main__":
    main()
