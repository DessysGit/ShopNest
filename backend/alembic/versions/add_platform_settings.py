"""Add platform settings tables

Revision ID: add_platform_settings
Revises: previous_revision
Create Date: 2025-10-13 12:00:00.000000

This migration adds:
1. platform_settings table - stores configurable platform settings
2. settings_audit_log table - tracks all setting changes

These tables enable admins to modify platform behavior without code changes.
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
import uuid

# revision identifiers, used by Alembic.
revision = 'add_platform_settings'
down_revision = None  # TODO: Update this to your latest migration
branch_labels = None
depends_on = None


def upgrade():
    """
    Create platform settings tables and populate with default values
    """
    
    # Create enum type for setting types
    setting_type_enum = postgresql.ENUM(
        'COMMISSION', 'GENERAL', 'PAYMENT', 'NOTIFICATION',
        name='settingtype',
        create_type=False
    )
    setting_type_enum.create(op.get_bind(), checkfirst=True)
    
    # Create platform_settings table
    op.create_table(
        'platform_settings',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('setting_key', sa.String(), nullable=False, unique=True, index=True),
        sa.Column('setting_name', sa.String(), nullable=False),
        sa.Column('setting_description', sa.Text(), nullable=True),
        sa.Column('setting_value', postgresql.JSON(astext_type=sa.Text()), nullable=False),
        sa.Column('default_value', postgresql.JSON(astext_type=sa.Text()), nullable=False),
        sa.Column('setting_type', setting_type_enum, nullable=False, server_default='GENERAL'),
        sa.Column('min_value', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('max_value', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('allowed_values', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('requires_confirmation', sa.Boolean(), default=False),
        sa.Column('is_sensitive', sa.Boolean(), default=False),
        sa.Column('is_editable', sa.Boolean(), default=True),
        sa.Column('updated_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    
    # Create settings_audit_log table
    op.create_table(
        'settings_audit_log',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('setting_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('platform_settings.id'), nullable=False),
        sa.Column('setting_key', sa.String(), nullable=False),
        sa.Column('old_value', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('new_value', postgresql.JSON(astext_type=sa.Text()), nullable=False),
        sa.Column('change_reason', sa.Text(), nullable=True),
        sa.Column('changed_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('ip_address', sa.String(), nullable=True),
        sa.Column('user_agent', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    
    # Create indexes for better query performance
    op.create_index('idx_settings_key', 'platform_settings', ['setting_key'])
    op.create_index('idx_settings_type', 'platform_settings', ['setting_type'])
    op.create_index('idx_audit_setting_id', 'settings_audit_log', ['setting_id'])
    op.create_index('idx_audit_created_at', 'settings_audit_log', ['created_at'])
    
    # Insert default platform settings
    op.execute("""
        INSERT INTO platform_settings (
            id, setting_key, setting_name, setting_description, 
            setting_value, default_value, setting_type,
            min_value, max_value, requires_confirmation, is_editable
        ) VALUES
        -- Commission Settings
        (
            gen_random_uuid(),
            'default_commission_rate',
            'Default Commission Rate',
            'Default commission rate (%) applied to new sellers. Existing sellers keep their assigned rate.',
            '10.0',
            '10.0',
            'COMMISSION',
            '0.0',
            '100.0',
            true,
            true
        ),
        (
            gen_random_uuid(),
            'apply_commission_to_existing',
            'Apply to Existing Sellers',
            'If true, commission rate changes apply to all sellers. If false, only affects new sellers.',
            'false',
            'false',
            'COMMISSION',
            NULL,
            NULL,
            true,
            true
        ),
        
        -- General Settings
        (
            gen_random_uuid(),
            'low_stock_threshold',
            'Low Stock Threshold',
            'Number of items remaining before a low stock warning is shown',
            '5',
            '5',
            'GENERAL',
            '1',
            '100',
            false,
            true
        ),
        (
            gen_random_uuid(),
            'platform_name',
            'Platform Name',
            'Display name of the platform',
            '"ShopNest"',
            '"ShopNest"',
            'GENERAL',
            NULL,
            NULL,
            false,
            true
        ),
        (
            gen_random_uuid(),
            'platform_email',
            'Platform Contact Email',
            'Primary contact email for the platform',
            '"support@shopnest.com"',
            '"support@shopnest.com"',
            'GENERAL',
            NULL,
            NULL,
            false,
            true
        ),
        (
            gen_random_uuid(),
            'maintenance_mode',
            'Maintenance Mode',
            'Enable to show maintenance page to users (admins can still access)',
            'false',
            'false',
            'GENERAL',
            NULL,
            NULL,
            true,
            true
        ),
        (
            gen_random_uuid(),
            'featured_products_limit',
            'Featured Products Limit',
            'Maximum number of products that can be featured on homepage',
            '12',
            '12',
            'GENERAL',
            '1',
            '50',
            false,
            true
        ),
        (
            gen_random_uuid(),
            'max_product_images',
            'Max Product Images',
            'Maximum number of images per product',
            '10',
            '10',
            'GENERAL',
            '1',
            '20',
            false,
            true
        ),
        (
            gen_random_uuid(),
            'seller_approval_required',
            'Seller Approval Required',
            'If true, sellers must be approved by admin before they can list products',
            'true',
            'true',
            'GENERAL',
            NULL,
            NULL,
            true,
            true
        ),
        
        -- Notification Settings
        (
            gen_random_uuid(),
            'send_order_emails',
            'Send Order Confirmation Emails',
            'Send email to buyers when order is placed',
            'true',
            'true',
            'NOTIFICATION',
            NULL,
            NULL,
            false,
            true
        ),
        (
            gen_random_uuid(),
            'send_seller_notifications',
            'Send Seller Order Notifications',
            'Notify sellers when they receive a new order',
            'true',
            'true',
            'NOTIFICATION',
            NULL,
            NULL,
            false,
            true
        )
    """)


def downgrade():
    """
    Remove platform settings tables and enum type
    """
    op.drop_index('idx_audit_created_at', 'settings_audit_log')
    op.drop_index('idx_audit_setting_id', 'settings_audit_log')
    op.drop_index('idx_settings_type', 'platform_settings')
    op.drop_index('idx_settings_key', 'platform_settings')
    
    op.drop_table('settings_audit_log')
    op.drop_table('platform_settings')
    
    # Drop enum type
    setting_type_enum = postgresql.ENUM(
        'COMMISSION', 'GENERAL', 'PAYMENT', 'NOTIFICATION',
        name='settingtype'
    )
    setting_type_enum.drop(op.get_bind(), checkfirst=True)
