import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Enum as SAEnum
from sqlalchemy import ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import AnalyticsEventType
from app.models.mixins import Entity

if TYPE_CHECKING:
    from app.models.catalog.product import Product
    from app.models.users.customer import Customer


class ProductAnalyticsEvent(Entity, Base):
    """Append-only event log (mirrors AuditLog's shape) backing the
    dashboard's "most viewed"/"most added to cart" widgets. Favorites and
    order counts already have durable tables of their own (Favorite,
    OrderItem) and are aggregated directly from those instead of logged
    here."""

    __tablename__ = "product_analytics_events"
    __table_args__ = (
        Index("ix_product_analytics_events_product_id", "product_id"),
        Index("ix_product_analytics_events_event_type", "event_type"),
    )

    product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"), nullable=False
    )
    event_type: Mapped[AnalyticsEventType] = mapped_column(
        SAEnum(AnalyticsEventType, name="analytics_event_type"), nullable=False
    )
    # Intentionally nullable + SET NULL: an analytics event should outlive
    # the customer who triggered it (matches AuditLog.actor_id's rationale),
    # since these rows exist purely for aggregate counts, not per-customer
    # history.
    customer_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("customers.id", ondelete="SET NULL")
    )

    product: Mapped["Product"] = relationship(
        back_populates="analytics_events", passive_deletes=True
    )
    customer: Mapped["Customer | None"] = relationship()
