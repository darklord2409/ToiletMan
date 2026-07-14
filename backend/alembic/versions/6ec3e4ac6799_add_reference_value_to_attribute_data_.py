"""add reference value to attribute_data_type enum

Revision ID: 6ec3e4ac6799
Revises: a7a032238a52
Create Date: 2026-07-05 06:02:17.936064

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6ec3e4ac6799'
down_revision: Union[str, None] = 'a7a032238a52'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Postgres forbids using a newly added enum label inside the same
    # transaction it was added in; autocommit_block() runs this ALTER TYPE
    # outside Alembic's normal per-migration transaction so later rows can
    # use 'REFERENCE' immediately (needed by scripts/seed_catalog.py).
    with op.get_context().autocommit_block():
        op.execute("ALTER TYPE attribute_data_type ADD VALUE IF NOT EXISTS 'REFERENCE'")


def downgrade() -> None:
    # Postgres has no ALTER TYPE ... DROP VALUE; removing a label requires
    # rebuilding the type (rename, recreate, migrate column, drop old type).
    # Left as a no-op since no data uses 'REFERENCE' until this revision's
    # upgrade has run in a given environment.
    pass
