from collections.abc import Callable
from typing import Any

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db


def make_service_dependency(
    service_cls: type, repository_cls: type
) -> Callable[[AsyncSession], Any]:
    """Builds a FastAPI dependency that wires session -> repository ->
    service for one entity, so routers never construct these by hand."""

    def _get_service(session: AsyncSession = Depends(get_db)) -> Any:
        return service_cls(repository_cls(session))

    return _get_service
