"""merge platform settings and reviews branches

Revision ID: 7b8f1117926e
Revises: 20251012_add_reviews, add_platform_settings
Create Date: 2025-10-14 18:00:08.543313

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '7b8f1117926e'
down_revision = ('20251012_add_reviews', 'add_platform_settings')
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
