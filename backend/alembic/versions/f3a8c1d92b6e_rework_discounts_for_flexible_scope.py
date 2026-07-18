"""rework discounts for flexible scope (all/category/product)

Revision ID: f3a8c1d92b6e
Revises: dd3d40ef2a34
Create Date: 2026-07-16 09:08:51.746237

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f3a8c1d92b6e'
down_revision: Union[str, None] = 'dd3d40ef2a34'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Postgres forbids using a newly added enum label inside the same
    # transaction it was added in, so this runs outside Alembic's normal
    # per-migration transaction (matches 6ec3e4ac6799's precedent).
    with op.get_context().autocommit_block():
        op.execute("ALTER TYPE discount_scope ADD VALUE IF NOT EXISTS 'ALL'")

    # A Discount becomes fully self-sufficient (its own active flag + date
    # window) so admins can create one directly, without first setting up a
    # Promotion — grouping several under a named Promotion stays possible
    # but becomes optional.
    op.alter_column('discounts', 'promotion_id', existing_type=sa.UUID(), nullable=True)
    op.add_column('discounts', sa.Column('name', sa.String(length=150), nullable=True))
    op.add_column(
        'discounts',
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.true()),
    )
    op.add_column('discounts', sa.Column('starts_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('discounts', sa.Column('ends_at', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column('discounts', 'ends_at')
    op.drop_column('discounts', 'starts_at')
    op.drop_column('discounts', 'is_active')
    op.drop_column('discounts', 'name')
    op.alter_column('discounts', 'promotion_id', existing_type=sa.UUID(), nullable=False)
    # Postgres has no ALTER TYPE ... DROP VALUE; removing the 'ALL' label
    # requires rebuilding the type. Left as a no-op, consistent with this
    # repo's existing precedent for enum-value migrations.
