"""Fix NULL boolean values in platform_settings

Revision ID: 20251015_fix_nulls
Revises: 20251015_fix_enum
Create Date: 2025-10-15 01:00:00.000000

This migration sets proper defaults for boolean columns that may have NULL values.
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '20251015_fix_nulls'
down_revision = '20251015_fix_enum'
branch_labels = None
depends_on = None


def upgrade():
    """
    Set proper defaults for boolean columns and update NULL values
    """
    
    # Update NULL values to defaults
    op.execute("""
        UPDATE platform_settings 
        SET requires_confirmation = false 
        WHERE requires_confirmation IS NULL
    """)
    
    op.execute("""
        UPDATE platform_settings 
        SET is_sensitive = false 
        WHERE is_sensitive IS NULL
    """)
    
    op.execute("""
        UPDATE platform_settings 
        SET is_editable = true 
        WHERE is_editable IS NULL
    """)
    
    # Set NOT NULL constraints and defaults
    op.execute("""
        ALTER TABLE platform_settings 
        ALTER COLUMN requires_confirmation SET DEFAULT false
    """)
    
    op.execute("""
        ALTER TABLE platform_settings 
        ALTER COLUMN requires_confirmation SET NOT NULL
    """)
    
    op.execute("""
        ALTER TABLE platform_settings 
        ALTER COLUMN is_sensitive SET DEFAULT false
    """)
    
    op.execute("""
        ALTER TABLE platform_settings 
        ALTER COLUMN is_sensitive SET NOT NULL
    """)
    
    op.execute("""
        ALTER TABLE platform_settings 
        ALTER COLUMN is_editable SET DEFAULT true
    """)
    
    op.execute("""
        ALTER TABLE platform_settings 
        ALTER COLUMN is_editable SET NOT NULL
    """)
    
    print("✅ Fixed NULL boolean values and set NOT NULL constraints")


def downgrade():
    """
    Remove NOT NULL constraints (allow NULLs again)
    """
    
    op.execute("""
        ALTER TABLE platform_settings 
        ALTER COLUMN requires_confirmation DROP NOT NULL
    """)
    
    op.execute("""
        ALTER TABLE platform_settings 
        ALTER COLUMN requires_confirmation DROP DEFAULT
    """)
    
    op.execute("""
        ALTER TABLE platform_settings 
        ALTER COLUMN is_sensitive DROP NOT NULL
    """)
    
    op.execute("""
        ALTER TABLE platform_settings 
        ALTER COLUMN is_sensitive DROP DEFAULT
    """)
    
    op.execute("""
        ALTER TABLE platform_settings 
        ALTER COLUMN is_editable DROP NOT NULL
    """)
    
    op.execute("""
        ALTER TABLE platform_settings 
        ALTER COLUMN is_editable DROP DEFAULT
    """)
