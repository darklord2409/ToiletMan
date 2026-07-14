from typing import Any, Literal

from pydantic import BaseModel

ImportMode = Literal["full", "price_only", "stock_only"]


class ImportRowPreview(BaseModel):
    row_number: int
    sku: str | None = None
    action: Literal["create", "update", "skip"]
    errors: list[str] = []
    data: dict[str, Any] = {}


class ImportPreviewResponse(BaseModel):
    total_rows: int
    valid_rows: int
    invalid_rows: int
    create_count: int
    update_count: int
    duplicate_skus_in_file: list[str] = []
    rows: list[ImportRowPreview]


class ImportRowError(BaseModel):
    row_number: int
    sku: str | None = None
    message: str


class ImportCommitResponse(BaseModel):
    created_count: int
    updated_count: int
    skipped_count: int
    errors: list[ImportRowError] = []
