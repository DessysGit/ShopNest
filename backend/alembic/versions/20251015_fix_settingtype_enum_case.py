"""Fix settingtype enum case - convert to uppercase

Revision ID: 20251015_fix_enum
Revises: 7b8f1117926e
Create Date: 2025-10-15 00:00:00.000000

This migration fixes the case mismatch in the settingtype enum.
The database had lowercase values but Python expects uppercase.
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '20251015_fix_enum'
down_revision = '7b8f1117926e'  # The latest merged migration
branch_labels = None
depends_on = None


def upgrade():
    """
    Convert settingtype enum from lowercase to uppercase
    
    Steps:
    1. Create a temporary column with TEXT type
    2. Copy uppercase values to temp column
    3. Drop the old enum column
    4. Recreate the enum type with uppercase values
    5. Recreate the column with the new enum type
    6. Copy data back from temp column
    7. Drop temp column
    """
    
    # Step 1: Add temporary column
    op.add_column('platform_settings', 
        sa.Column('setting_type_temp', sa.String(), nullable=True)
    )
    
    # Step 2: Copy data with uppercase conversion
    op.execute("""
        UPDATE platform_settings 
        SET setting_type_temp = UPPER(setting_type::text)
    """)
    
    # Step 3: Drop the old column (this removes the constraint on the old enum)
    op.drop_column('platform_settings', 'setting_type')
    
    # Step 4: Drop and recreate the enum type with uppercase values
    op.execute("DROP TYPE IF EXISTS settingtype")
    op.execute("""
        CREATE TYPE settingtype AS ENUM ('COMMISSION', 'GENERAL', 'PAYMENT', 'NOTIFICATION')
    """)
    
    # Step 5: Add the column back with the new enum type
    op.add_column('platform_settings',
        sa.Column('setting_type', 
            postgresql.ENUM('COMMISSION', 'GENERAL', 'PAYMENT', 'NOTIFICATION', 
                          name='settingtype', create_type=False),
            nullable=True)
    )
    
    # Step 6: Copy data from temp column to new enum column
    op.execute("""
        UPDATE platform_settings 
        SET setting_type = setting_type_temp::settingtype
    """)
    
    # Step 7: Make setting_type NOT NULL and set default
    op.execute("""
        ALTER TABLE platform_settings 
        ALTER COLUMN setting_type SET NOT NULL
    """)
    op.execute("""
        ALTER TABLE platform_settings 
        ALTER COLUMN setting_type SET DEFAULT 'GENERAL'::settingtype
    """)
    
    # Step 8: Drop temp column
    op.drop_column('platform_settings', 'setting_type_temp')
    
    # Recreate the index
    op.create_index('idx_settings_type', 'platform_settings', ['setting_type'], unique=False)
    
    print("✅ Successfully converted settingtype enum to uppercase!")


def downgrade():
    """
    Convert settingtype enum from uppercase back to lowercase
    """
    
    # Add temporary column
    op.add_column('platform_settings', 
        sa.Column('setting_type_temp', sa.String(), nullable=True)
    )
    
    # Copy data with lowercase conversion
    op.execute("""
        UPDATE platform_settings 
        SET setting_type_temp = LOWER(setting_type::text)
    """)
    
    # Drop the index
    op.drop_index('idx_settings_type', 'platform_settings')
    
    # Drop the uppercase column
    op.drop_column('platform_settings', 'setting_type')
    
    # Drop and recreate enum with lowercase
    op.execute("DROP TYPE IF EXISTS settingtype")
    op.execute("""
        CREATE TYPE settingtype AS ENUM ('commission', 'general', 'payment', 'notification')
    """)
    
    # Add column back with lowercase enum
    op.add_column('platform_settings',
        sa.Column('setting_type', 
            postgresql.ENUM('commission', 'general', 'payment', 'notification', 
                          name='settingtype', create_type=False),
            nullable=True)
    )
    
    # Copy data back
    op.execute("""
        UPDATE platform_settings 
        SET setting_type = setting_type_temp::settingtype
    """)
    
    # Make NOT NULL and set default
    op.execute("""
        ALTER TABLE platform_settings 
        ALTER COLUMN setting_type SET NOT NULL
    """)
    op.execute("""
        ALTER TABLE platform_settings 
        ALTER COLUMN setting_type SET DEFAULT 'general'::settingtype
    """)
    
    # Drop temp column
    op.drop_column('platform_settings', 'setting_type_temp')
    
    # Recreate index
    op.create_index('idx_settings_type', 'platform_settings', ['setting_type'], unique=False)
