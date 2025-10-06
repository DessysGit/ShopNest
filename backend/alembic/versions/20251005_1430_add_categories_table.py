"""Add categories table

Revision ID: 20251005_1430
Revises: 56a221e436e1
Create Date: 2025-10-05 14:30:00

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '20251005_1430'
down_revision = '56a221e436e1'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create categories table
    op.create_table('categories',
    sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
    sa.Column('name', sa.String(), nullable=False),
    sa.Column('slug', sa.String(), nullable=False),
    sa.Column('description', sa.Text(), nullable=True),
    sa.Column('icon', sa.String(), nullable=True),
    sa.Column('parent_id', postgresql.UUID(as_uuid=True), nullable=True),
    sa.Column('is_active', sa.Boolean(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    sa.ForeignKeyConstraint(['parent_id'], ['categories.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_categories_name'), 'categories', ['name'], unique=False)
    op.create_index(op.f('ix_categories_slug'), 'categories', ['slug'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_categories_slug'), table_name='categories')
    op.drop_index(op.f('ix_categories_name'), table_name='categories')
    op.drop_table('categories')
