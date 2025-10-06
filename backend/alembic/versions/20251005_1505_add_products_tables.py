"""Add products tables

Revision ID: 20251005_1505
Revises: 20251005_1430
Create Date: 2025-10-05 15:05:00

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '20251005_1505'
down_revision = '20251005_1430'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create products table
    op.create_table('products',
    sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
    sa.Column('seller_id', postgresql.UUID(as_uuid=True), nullable=False),
    sa.Column('category_id', postgresql.UUID(as_uuid=True), nullable=False),
    sa.Column('name', sa.String(), nullable=False),
    sa.Column('slug', sa.String(), nullable=False),
    sa.Column('description', sa.Text(), nullable=True),
    sa.Column('price', sa.Numeric(precision=10, scale=2), nullable=False),
    sa.Column('compare_at_price', sa.Numeric(precision=10, scale=2), nullable=True),
    sa.Column('cost_per_item', sa.Numeric(precision=10, scale=2), nullable=True),
    sa.Column('sku', sa.String(), nullable=True),
    sa.Column('barcode', sa.String(), nullable=True),
    sa.Column('quantity', sa.Integer(), nullable=True),
    sa.Column('low_stock_threshold', sa.Integer(), nullable=True),
    sa.Column('weight', sa.Numeric(precision=10, scale=2), nullable=True),
    sa.Column('dimensions', postgresql.JSON(astext_type=sa.Text()), nullable=True),
    sa.Column('is_digital', sa.Boolean(), nullable=True),
    sa.Column('digital_file_url', sa.String(), nullable=True),
    sa.Column('is_active', sa.Boolean(), nullable=True),
    sa.Column('is_featured', sa.Boolean(), nullable=True),
    sa.Column('views_count', sa.Integer(), nullable=True),
    sa.Column('sales_count', sa.Integer(), nullable=True),
    sa.Column('rating_average', sa.Numeric(precision=3, scale=2), nullable=True),
    sa.Column('total_reviews', sa.Integer(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    sa.ForeignKeyConstraint(['category_id'], ['categories.id'], ),
    sa.ForeignKeyConstraint(['seller_id'], ['seller_profiles.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('slug'),
    sa.UniqueConstraint('sku')
    )
    op.create_index(op.f('ix_products_name'), 'products', ['name'], unique=False)
    op.create_index(op.f('ix_products_slug'), 'products', ['slug'], unique=False)
    
    # Create product_images table
    op.create_table('product_images',
    sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
    sa.Column('product_id', postgresql.UUID(as_uuid=True), nullable=False),
    sa.Column('image_url', sa.String(), nullable=False),
    sa.Column('alt_text', sa.String(), nullable=True),
    sa.Column('position', sa.Integer(), nullable=True),
    sa.Column('is_primary', sa.Boolean(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
    sa.ForeignKeyConstraint(['product_id'], ['products.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )


def downgrade() -> None:
    op.drop_table('product_images')
    op.drop_index(op.f('ix_products_slug'), table_name='products')
    op.drop_index(op.f('ix_products_name'), table_name='products')
    op.drop_table('products')
