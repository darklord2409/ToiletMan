from dataclasses import dataclass

from fastapi import Query

from app.core.i18n import translate


@dataclass(slots=True)
class PaginationParams:
    page: int
    page_size: int

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.page_size

    @property
    def limit(self) -> int:
        return self.page_size


def pagination_params(
    page: int = Query(1, ge=1, description=translate("swagger.filters.page")),
    page_size: int = Query(20, ge=1, le=100, description=translate("swagger.filters.page_size")),
) -> PaginationParams:
    return PaginationParams(page=page, page_size=page_size)
