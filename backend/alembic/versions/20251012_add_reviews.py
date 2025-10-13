"""Add reviews table

Revision ID: 20251012_add_reviews
Revises: 87df50b1ee3d
Create Date: 2025-10-12 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '20251012_add_reviews'
down_revision = '87df50b1ee3d'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create reviews table
    op.create_table(
        'reviews',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('product_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('order_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('rating', sa.Integer(), nullable=False),
        sa.Column('comment', sa.Text(), nullable=False),
        sa.Column('helpful_count', sa.Integer(), server_default='0', nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint('rating >= 1 AND rating <= 5', name='valid_rating'),
        sa.CheckConstraint('LENGTH(comment) >= 10', name='min_comment_length'),
        sa.ForeignKeyConstraint(['order_id'], ['orders.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['product_id'], ['products.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create index for faster queries
    op.create_index('ix_reviews_product_id', 'reviews', ['product_id'])
    op.create_index('ix_reviews_user_id', 'reviews', ['user_id'])


def downgrade() -> None:
    # Drop indexes
    op.drop_index('ix_reviews_user_id', table_name='reviews')
    op.drop_index('ix_reviews_product_id', table_name='reviews')
    
    # Drop table
    op.drop_table('reviews')
