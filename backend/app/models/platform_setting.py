"""
Platform Settings Model

This model stores configurable platform settings that admins can modify
without code changes. Includes audit logging for all changes.

Key Features:
- JSON storage for flexible setting values
- Type categorization (commission, general, payment)
- Confirmation requirement flag for critical settings
- Full audit trail of all changes
"""

from sqlalchemy import Column, String, Boolean, DateTime, Text, JSON, Enum as SQLEnum, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
import enum
from app.database import Base


class SettingType(str, enum.Enum):
    """
    Categories of platform settings
    - COMMISSION: Revenue-related settings (commission rates, fees)
    - GENERAL: General platform settings (name, limits, thresholds)
    - PAYMENT: Payment gateway settings (Stripe keys, currency)
    - NOTIFICATION: Email/SMS notification settings
    """
    COMMISSION = "COMMISSION"
    GENERAL = "GENERAL"
    PAYMENT = "PAYMENT"
    NOTIFICATION = "NOTIFICATION"


class PlatformSetting(Base):
    """
    Platform Settings Table
    
    Stores all configurable platform settings. Settings are stored as JSON
    to allow flexibility in value types (strings, numbers, booleans, objects).
    
    Critical settings (like commission rates) require confirmation before changes.
    All changes are logged in the audit table.
    """
    __tablename__ = "platform_settings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Setting identification
    setting_key = Column(String, unique=True, nullable=False, index=True)  # e.g., "default_commission_rate"
    setting_name = Column(String, nullable=False)  # Human-readable name: "Default Commission Rate"
    setting_description = Column(Text)  # Explanation of what this setting does
    
    # Setting value and metadata
    setting_value = Column(JSON, nullable=False)  # Actual value (can be any JSON type)
    default_value = Column(JSON, nullable=False)  # Default value for reset functionality
    setting_type = Column(SQLEnum(SettingType), nullable=False, default=SettingType.GENERAL)
    
    # Validation and constraints
    min_value = Column(JSON, nullable=True)  # Minimum allowed value (for numbers)
    max_value = Column(JSON, nullable=True)  # Maximum allowed value (for numbers)
    allowed_values = Column(JSON, nullable=True)  # List of allowed values (for enums)
    
    # Security and change control
    requires_confirmation = Column(Boolean, default=False)  # Requires password confirmation to change
    is_sensitive = Column(Boolean, default=False)  # Hide value in UI (for API keys)
    is_editable = Column(Boolean, default=True)  # Can be edited by admin
    
    # Audit information
    updated_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    updated_by_user = relationship("User", foreign_keys=[updated_by])
    audit_logs = relationship("SettingsAuditLog", back_populates="setting", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<PlatformSetting {self.setting_key}={self.setting_value}>"


class SettingsAuditLog(Base):
    """
    Settings Change Audit Log
    
    Records every change made to platform settings for accountability and rollback.
    Critical for tracking who changed what, when, and why.
    
    Includes IP address tracking and optional change reason.
    """
    __tablename__ = "settings_audit_log"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # What was changed
    setting_id = Column(UUID(as_uuid=True), ForeignKey("platform_settings.id"), nullable=False)
    setting_key = Column(String, nullable=False)  # Stored for history even if setting deleted
    
    # Change details
    old_value = Column(JSON, nullable=True)  # Previous value
    new_value = Column(JSON, nullable=False)  # New value
    change_reason = Column(Text)  # Optional reason provided by admin
    
    # Who and when
    changed_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    ip_address = Column(String)  # IP address of admin making change
    user_agent = Column(String)  # Browser/client information
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    setting = relationship("PlatformSetting", back_populates="audit_logs")
    changed_by_user = relationship("User", foreign_keys=[changed_by])

    def __repr__(self):
        return f"<SettingsAuditLog {self.setting_key}: {self.old_value} → {self.new_value}>"
