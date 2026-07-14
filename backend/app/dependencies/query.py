from dataclasses import dataclass

from fastapi import Query


@dataclass(slots=True)
class ListQueryParams:
    sort_by: str | None
    sort_order: str
    search: str | None


def list_query_params(
    sort_by: str | None = Query(None, description="Column name to sort by"),
    sort_order: str = Query("asc", pattern="^(asc|desc)$", description="Sort direction"),
    search: str | None = Query(None, description="Free-text search across searchable fields"),
) -> ListQueryParams:
    return ListQueryParams(sort_by=sort_by, sort_order=sort_order, search=search)
