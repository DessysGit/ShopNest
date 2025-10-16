"""
Platform Settings Schemas

Pydantic schemas for platform settings API requests and responses.
Includes validation for setting values and confirmation requirements.
"""

from pydantic import BaseModel, Field, validator
from typing import Optional, Any, List
from datetime import datetime
from uuid import UUID


# ============= Setting Value Schemas =============

class SettingValueUpdate(BaseModel):
    """
    Schema for updating a setting value
    Supports any JSON-serializable value
    """
    value: Any = Field(..., description="New setting value")
    reason: Optional[str] = Field(None, max_length=500, description="Reason for change (optional)")

    class Config:
        json_schema_extra = {
            "example": {
                "value": 12.5,
                "reason": "Adjusting commission to match market rates"
            }
        }


class SettingConfirmation(BaseModel):
    """
    Schema for confirming a critical setting change
    Requires admin password for verification
    """
    setting_key: str = Field(..., description="Setting identifier")
    new_value: Any = Field(..., description="New value to set")
    password: str = Field(..., min_length=1, description="Admin password for confirmation")
    reason: Optional[str] = Field(None, max_length=500, description="Reason for change")

    class Config:
        json_schema_extra = {
            "example": {
                "setting_key": "default_commission_rate",
                "new_value": 12.5,
                "password": "admin_password",
                "reason": "Market adjustment"
            }
        }


# ============= Setting Response Schemas =============

class SettingResponse(BaseModel):
    """
    Response schema for a single setting
    Includes metadata and validation rules
    """
    id: UUID
    setting_key: str
    setting_name: str
    setting_description: Optional[str]
    setting_value: Any
    default_value: Any
    setting_type: str
    
    # Validation constraints
    min_value: Optional[Any]
    max_value: Optional[Any]
    allowed_values: Optional[List[Any]]
    
    # Security flags (with defaults for NULL values from database)
    requires_confirmation: bool = False
    is_sensitive: bool = False
    is_editable: bool = True
    
    # Audit info
    updated_by: Optional[UUID]
    updated_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "setting_key": "default_commission_rate",
                "setting_name": "Default Commission Rate",
                "setting_description": "Default commission rate applied to new sellers",
                "setting_value": 10.0,
                "default_value": 10.0,
                "setting_type": "COMMISSION",
                "min_value": 0.0,
                "max_value": 100.0,
                "allowed_values": None,
                "requires_confirmation": True,
                "is_sensitive": False,
                "is_editable": True,
                "updated_by": None,
                "updated_at": None,
                "created_at": "2025-10-13T12:00:00Z"
            }
        }


class SettingResponsePublic(BaseModel):
    """
    Public response schema for settings (hides sensitive values)
    Used when returning settings to non-admin users
    """
    setting_key: str
    setting_name: str
    setting_value: Any  # Will be masked if sensitive
    setting_type: str

    class Config:
        from_attributes = True


# ============= Audit Log Schemas =============

class AuditLogResponse(BaseModel):
    """
    Response schema for audit log entries
    Shows complete change history
    """
    id: UUID
    setting_key: str
    old_value: Optional[Any]
    new_value: Any
    change_reason: Optional[str]
    changed_by: UUID
    changed_by_name: Optional[str] = None  # Computed field
    ip_address: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174001",
                "setting_key": "default_commission_rate",
                "old_value": 10.0,
                "new_value": 12.5,
                "change_reason": "Market adjustment",
                "changed_by": "123e4567-e89b-12d3-a456-426614174002",
                "changed_by_name": "Admin User",
                "ip_address": "192.168.1.1",
                "created_at": "2025-10-13T12:00:00Z"
            }
        }


# ============= Bulk Operations =============

class SettingsGroupResponse(BaseModel):
    """
    Response schema for grouped settings
    Returns settings organized by type
    """
    commission_settings: List[SettingResponse]
    general_settings: List[SettingResponse]
    payment_settings: List[SettingResponse]
    notification_settings: List[SettingResponse]

    class Config:
        json_schema_extra = {
            "example": {
                "commission_settings": [
                    {
                        "setting_key": "default_commission_rate",
                        "setting_name": "Default Commission Rate",
                        "setting_value": 10.0
                    }
                ],
                "general_settings": [],
                "payment_settings": [],
                "notification_settings": []
            }
        }


class BulkSettingUpdate(BaseModel):
    """
    Schema for updating multiple settings at once
    Useful for saving a form with multiple fields
    """
    settings: List[dict] = Field(..., description="List of settings to update")
    password: Optional[str] = Field(None, description="Password if any setting requires confirmation")
    reason: Optional[str] = Field(None, max_length=500, description="Reason for bulk change")

    @validator('settings')
    def validate_settings(cls, v):
        """Ensure each setting has required fields"""
        for setting in v:
            if 'setting_key' not in setting or 'value' not in setting:
                raise ValueError("Each setting must have 'setting_key' and 'value'")
        return v

    class Config:
        json_schema_extra = {
            "example": {
                "settings": [
                    {"setting_key": "default_commission_rate", "value": 12.5},
                    {"setting_key": "low_stock_threshold", "value": 3}
                ],
                "password": "admin_password",
                "reason": "Quarterly settings update"
            }
        }


# ============= Validation Response =============

class SettingValidationResponse(BaseModel):
    """
    Response schema for setting value validation
    Returns whether a value is valid and why
    """
    is_valid: bool
    errors: List[str] = []
    warnings: List[str] = []
    suggested_value: Optional[Any] = None

    class Config:
        json_schema_extra = {
            "example": {
                "is_valid": False,
                "errors": ["Value 150.0 exceeds maximum allowed value of 100.0"],
                "warnings": [],
                "suggested_value": 100.0
            }
        }


# ============= Impact Analysis =============

class SettingImpactAnalysis(BaseModel):
    """
    Response schema for analyzing the impact of a setting change
    Shows what will be affected by the change
    """
    setting_key: str
    current_value: Any
    new_value: Any
    affected_entities: dict = Field(..., description="Entities affected by this change")
    estimated_impact: str = Field(..., description="High/Medium/Low impact assessment")
    warnings: List[str] = []
    
    class Config:
        json_schema_extra = {
            "example": {
                "setting_key": "default_commission_rate",
                "current_value": 10.0,
                "new_value": 15.0,
                "affected_entities": {
                    "new_sellers": "All future sellers will have 15% commission",
                    "existing_sellers": "Not affected (current rate preserved)"
                },
                "estimated_impact": "High",
                "warnings": [
                    "This is a 50% increase in commission rate",
                    "May affect seller registration rate"
                ]
            }
        }
