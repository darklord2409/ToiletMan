from typing import Any

from sqlalchemy import String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.mixins import Entity


class SiteSetting(Entity, Base):
    __tablename__ = "site_settings"

    key: Mapped[str] = mapped_column(String(150), nullable=False, unique=True)
    value: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    description: Mapped[str | None] = mapped_column(Text)
