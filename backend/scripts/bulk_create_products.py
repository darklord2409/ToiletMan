import json
import os
import re
import unicodedata

import httpx

BASE = "http://localhost:8000/api/v1"
DATA_JSON = "/tmp/catalog_data.json"
IDS_JSON = "/tmp/catalog_ids.json"
USD_TO_UZS = 12700
PCS_UNIT_ID = "98786b3f-9f5b-431f-862f-404dee1bdeca"

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
    # PDF text-wrap artifacts (a mid-word line break landed as a literal
    # space with no hyphen) — same targets as their clean equivalents above.
    "скобяные издел ия": ("accessories", "Скобяные изделия", "accessory"),
    "сушилка для ру к": ("accessories", "Сушилки для рук", "hand_dryer"),
    "раковина для м ытья ног": ("plumbing", "Раковины для мытья ног", "sink"),
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
    "скобяные издел ия": "Аксессуар для ванной",
    "сушилка для ру к": "Сушилка для рук",
    "раковина для м ытья ног": "Раковина для мытья ног",
}

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


def normalize_category(raw: str) -> str:
    return re.sub(r"\s+", " ", raw.replace("\n", " ")).strip().lower()


RETRY_ONLY_CODES = {
    "BYWJ999-HJ", "BYWJ888H", "BYWJ888QH", "BYWJ666H", "BYWJ666QH",
    "BY WS S988", "BY WS S888", "BYM30010", "BYM30050",
}


def main() -> None:
    with open(DATA_JSON, encoding="utf-8") as fh:
        rows = json.load(fh)

    if os.environ.get("RETRY_ONLY"):
        rows = [r for r in rows if r["code"] in RETRY_ONLY_CODES]
    with open(IDS_JSON, encoding="utf-8") as fh:
        ids = json.load(fh)
    manufacturer_ids = ids["manufacturer_ids"]
    child_category_ids = {tuple(k.split("|", 1)): v for k, v in ids["child_category_ids"].items()}
    product_type_ids = ids["product_type_ids"]

    client = httpx.Client(base_url=BASE, timeout=30.0)
    resp = client.post(
        "/auth/login",
        data={"username": "playwright_e2e", "password": "PlaywrightE2E!2026"},
    )
    resp.raise_for_status()
    token = resp.json()["access_token"]
    client.headers["Authorization"] = f"Bearer {token}"

    created = 0
    failed = []
    seen_slugs: dict[str, int] = {}

    for i, row in enumerate(rows):
        code = row["code"]
        norm_cat = normalize_category(row["category"])
        mapping = CATEGORY_MAP.get(norm_cat)
        if mapping is None:
            print(f"[{i}] SKIP unknown category: {row['category']!r} ({code})")
            failed.append((code, "unknown category"))
            continue
        parent_key, child_name, pt_code = mapping
        category_id = child_category_ids[(parent_key, child_name)]
        product_type_id = product_type_ids[pt_code]
        manufacturer_id = manufacturer_ids[row["brand"]]

        label = CATEGORY_NAME_LABELS.get(norm_cat, child_name)
        name = f"{label} {code}"
        base_slug = slugify(f"{code}")
        seen_slugs[base_slug] = seen_slugs.get(base_slug, 0) + 1
        slug = base_slug if seen_slugs[base_slug] == 1 else f"{base_slug}-{seen_slugs[base_slug]}"

        price_uzs = round(row["price_usd"] * USD_TO_UZS / 100) * 100

        image_file_path = None
        if row.get("image_path"):
            try:
                with open(row["image_path"], "rb") as fh:
                    files = {"file": (f"{slug}.png", fh, "image/png")}
                    r = client.post("/uploaded-files/upload", files=files)
                r.raise_for_status()
                image_file_path = r.json()["file_path"]
            except Exception as e:  # noqa: BLE001
                print(f"[{i}] image upload failed for {code}: {e}")

        payload = {
            "category_id": category_id,
            "product_type_id": product_type_id,
            "manufacturer_id": manufacturer_id,
            "unit_id": PCS_UNIT_ID,
            "sku": code,
            "slug": slug,
            "name": name,
            "description": row["description"],
            "price": str(price_uzs),
            "currency": "UZS",
            "stock_quantity": 50,
            "status": "active",
        }
        try:
            r = client.post("/products", json=payload)
            r.raise_for_status()
            product = r.json()
        except Exception as e:  # noqa: BLE001
            print(f"[{i}] product create failed for {code}: {e}")
            failed.append((code, str(e)))
            continue

        if image_file_path:
            try:
                r = client.post(
                    "/product-images",
                    json={
                        "product_id": product["id"],
                        "url": image_file_path,
                        "is_primary": True,
                        "sort_order": 0,
                    },
                )
                r.raise_for_status()
            except Exception as e:  # noqa: BLE001
                print(f"[{i}] product-image attach failed for {code}: {e}")

        created += 1
        if created % 25 == 0:
            print(f"...{created} products created")

    print(f"Done. Created: {created}. Failed: {len(failed)}")
    if failed:
        print("Failures:", failed)


if __name__ == "__main__":
    main()
