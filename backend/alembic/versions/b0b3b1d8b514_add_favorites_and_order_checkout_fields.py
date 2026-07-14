"""add favorites and order checkout fields

Revision ID: b0b3b1d8b514
Revises: 6ec3e4ac6799
Create Date: 2026-07-05 15:24:14.264934

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'b0b3b1d8b514'
down_revision: Union[str, None] = '6ec3e4ac6799'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    delivery_method = postgresql.ENUM('PICKUP', 'DELIVERY', name='delivery_method')
    delivery_method.create(op.get_bind())
    payment_method = postgresql.ENUM('CASH', name='payment_method')
    payment_method.create(op.get_bind())

    op.add_column('orders', sa.Column('delivery_method', delivery_method, nullable=True))
    op.add_column('orders', sa.Column('payment_method', payment_method, nullable=True))
    op.add_column('orders', sa.Column('contact_name', sa.String(length=150), nullable=True))
    op.add_column('orders', sa.Column('contact_phone', sa.String(length=32), nullable=True))

    op.create_table(
        'favorites',
        sa.Column('customer_id', sa.UUID(), nullable=False),
        sa.Column('product_id', sa.UUID(), nullable=False),
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['customer_id'], ['customers.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['product_id'], ['products.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('customer_id', 'product_id', name='uq_favorite_customer_product'),
    )
    op.create_index('ix_favorites_customer_id', 'favorites', ['customer_id'])


def downgrade() -> None:
    op.drop_index('ix_favorites_customer_id', table_name='favorites')
    op.drop_table('favorites')

    op.drop_column('orders', 'contact_phone')
    op.drop_column('orders', 'contact_name')
    op.drop_column('orders', 'payment_method')
    op.drop_column('orders', 'delivery_method')

    postgresql.ENUM(name='payment_method').drop(op.get_bind())
    postgresql.ENUM(name='delivery_method').drop(op.get_bind())
