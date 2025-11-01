"""Add password reset tokens table

Revision ID: 20251031_password_reset
Revises: 20251015_fix_nulls
Create Date: 2025-10-31 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '20251031_password_reset'
down_revision = '20251015_fix_nulls'
branch_labels = None
depends_on = None


def upgrade():
    """Add password_reset_tokens table"""
    
    op.create_table(
        'password_reset_tokens',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False, index=True),
        sa.Column('token', sa.String(), unique=True, nullable=False, index=True),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('is_used', sa.Boolean(), default=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    
    # Create index for faster lookups
    op.create_index('idx_reset_token', 'password_reset_tokens', ['token'])
    op.create_index('idx_reset_user_id', 'password_reset_tokens', ['user_id'])
    
    print("✅ Created password_reset_tokens table")


def downgrade():
    """Remove password_reset_tokens table"""
    
    op.drop_index('idx_reset_user_id', 'password_reset_tokens')
    op.drop_index('idx_reset_token', 'password_reset_tokens')
    op.drop_table('password_reset_tokens')
