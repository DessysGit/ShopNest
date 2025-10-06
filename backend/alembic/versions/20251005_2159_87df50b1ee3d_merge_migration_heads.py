"""merge migration heads

Revision ID: 87df50b1ee3d
Revises: 078c7d5d180f, 20251005_1505
Create Date: 2025-10-05 21:59:38.440977

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '87df50b1ee3d'
down_revision = ('078c7d5d180f', '20251005_1505')
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
