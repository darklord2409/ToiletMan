import json
import os
import re
import unicodedata

import fitz

SRC = "/tmp/catalog.pdf"
OUT_DIR = "/tmp/catalog_images"
OUT_JSON = "/tmp/catalog_data.json"

os.makedirs(OUT_DIR, exist_ok=True)

# Page ranges (0-indexed) -> brand, based on visual inspection of the document.
def brand_for_page(i: int) -> str:
    if i >= 50:  # pages 51-58 (0-idx 50-57) are PLATO
        if i <= 57:
            return "PLATO"
        return "UMAX"  # pages 59-60 (0-idx 58-59)
    return "BOOYEA"


def slugify_code(code: str) -> str:
    code = code.replace("\n", "").strip()
    s = unicodedata.normalize("NFKD", code)
    s = re.sub(r"[^a-zA-Z0-9]+", "-", s).strip("-").lower()
    return s


doc = fitz.open(SRC)
rows_out = []
skipped_pages = []

for page_index in range(len(doc)):
    page = doc[page_index]
    tf = page.find_tables()
    if not tf.tables:
        skipped_pages.append(page_index + 1)
        continue
    t = tf.tables[0]
    extracted = t.extract()
    row_rects = t.rows
    brand = brand_for_page(page_index)

    for row_i, row in enumerate(extracted):
        if len(row) < 6:
            continue
        category_raw, code_raw, _pic, per_pack, desc_raw, price_raw = row[:6]
        if not code_raw or not price_raw:
            continue
        code_raw = code_raw.strip()
        price_raw = price_raw.strip()
        # Data rows always have a $ or a bare decimal number in the price cell.
        price_match = re.search(r"[\d]+\.?\d*", price_raw.replace(",", ""))
        if not price_match or not code_raw or code_raw in ("код",):
            continue
        if category_raw and category_raw.strip().lower() == "категория":
            continue

        price_usd = float(price_match.group())
        category = (category_raw or "").replace("\n", " ").strip()
        code = code_raw.replace("\n", "")
        description = (desc_raw or "").replace("\n", " ").strip()
        per_pack_clean = (per_pack or "").replace("\n", "").strip()

        # Crop+render the "Картина" cell (column index 2) as this row's photo.
        img_path = None
        try:
            cell_rect = row_rects[row_i].cells[2]
            if cell_rect and (cell_rect[3] - cell_rect[1]) > 5:
                rect = fitz.Rect(cell_rect)
                pix = page.get_pixmap(clip=rect, dpi=200)
                fname = f"p{page_index + 1:02d}_r{row_i:02d}_{slugify_code(code)}.png"
                fpath = os.path.join(OUT_DIR, fname)
                pix.save(fpath)
                img_path = fpath
        except Exception as e:  # noqa: BLE001
            print(f"image extraction failed p{page_index + 1} r{row_i}: {e}")

        rows_out.append(
            {
                "page": page_index + 1,
                "brand": brand,
                "category": category,
                "code": code,
                "per_pack": per_pack_clean,
                "description": description,
                "price_usd": price_usd,
                "image_path": img_path,
            }
        )

print(f"Extracted {len(rows_out)} rows. Skipped pages (no table): {skipped_pages}")
with open(OUT_JSON, "w", encoding="utf-8") as f:
    json.dump(rows_out, f, ensure_ascii=False, indent=2)
print(f"Wrote {OUT_JSON}")
