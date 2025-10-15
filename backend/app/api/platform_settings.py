"""
Platform Settings API Endpoints

Admin-only endpoints for managing platform configuration.
Includes password confirmation for critical changes and full audit logging.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from sqlalchemy import and_
from typing import List, Optional
from datetime import datetime

from app.database import get_db
from app.models.user import User
from app.models.platform_setting import PlatformSetting, SettingsAuditLog, SettingType
from app.schemas.platform_setting import (
    SettingResponse,
    SettingValueUpdate,
    SettingConfirmation,
    AuditLogResponse,
    SettingsGroupResponse,
    BulkSettingUpdate,
    SettingValidationResponse,
    SettingImpactAnalysis
)
from app.middleware.auth_middleware import get_current_admin
from passlib.context import CryptContext

router = APIRouter(prefix="/admin/settings", tags=["Admin - Settings"])

# Password verification
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    return pwd_context.verify(plain_password, hashed_password)


def get_client_ip(request: Request) -> str:
    """Extract client IP address"""
    if "x-forwarded-for" in request.headers:
        return request.headers["x-forwarded-for"].split(",")[0]
    return request.client.host if request.client else "unknown"


def validate_setting_value(setting: PlatformSetting, new_value: any) -> SettingValidationResponse:
    """Validate a new setting value against constraints"""
    errors = []
    warnings = []
    suggested_value = None
    
    # Check numeric min/max
    if setting.min_value is not None and isinstance(new_value, (int, float)):
        if new_value < setting.min_value:
            errors.append(f"Value {new_value} is below minimum allowed value of {setting.min_value}")
            suggested_value = setting.min_value
    
    if setting.max_value is not None and isinstance(new_value, (int, float)):
        if new_value > setting.max_value:
            errors.append(f"Value {new_value} exceeds maximum allowed value of {setting.max_value}")
            suggested_value = setting.max_value
    
    # Check allowed values
    if setting.allowed_values is not None:
        if new_value not in setting.allowed_values:
            errors.append(f"Value {new_value} is not in allowed values: {setting.allowed_values}")
    
    return SettingValidationResponse(
        is_valid=len(errors) == 0,
        errors=errors,
        warnings=warnings,
        suggested_value=suggested_value
    )


def analyze_setting_impact(setting: PlatformSetting, new_value: any, db: Session) -> SettingImpactAnalysis:
    """Analyze the impact of changing a setting"""
    affected_entities = {}
    warnings = []
    estimated_impact = "Low"
    
    # Commission rate impact
    if setting.setting_key == "default_commission_rate":
        from app.models.seller import SellerProfile
        total_sellers = db.query(SellerProfile).count()
        
        affected_entities["new_sellers"] = "All future sellers"
        affected_entities["existing_sellers"] = f"{total_sellers} existing sellers keep current rate"
        estimated_impact = "High"
        
        old_rate = float(setting.setting_value)
        new_rate = float(new_value)
        percent_change = abs((new_rate - old_rate) / old_rate * 100) if old_rate > 0 else 0
        
        if percent_change > 20:
            warnings.append(f"This is a {percent_change:.1f}% change in commission rate")
        
        if new_rate > old_rate:
            warnings.append("Increasing commission may affect seller acquisition")
    
    return SettingImpactAnalysis(
        setting_key=setting.setting_key,
        current_value=setting.setting_value,
        new_value=new_value,
        affected_entities=affected_entities,
        estimated_impact=estimated_impact,
        warnings=warnings
    )


def create_audit_log(setting, old_value, new_value, admin_user, ip_address, user_agent, reason, db):
    """Create audit log entry"""
    audit_entry = SettingsAuditLog(
        setting_id=setting.id,
        setting_key=setting.setting_key,
        old_value=old_value,
        new_value=new_value,
        change_reason=reason,
        changed_by=admin_user.id,
        ip_address=ip_address,
        user_agent=user_agent
    )
    db.add(audit_entry)
    return audit_entry


# API Endpoints

@router.get("", response_model=List[SettingResponse])
async def get_all_settings(
    setting_type: Optional[SettingType] = None,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get all platform settings"""
    query = db.query(PlatformSetting)
    
    if setting_type:
        query = query.filter(PlatformSetting.setting_type == setting_type)
    
    settings = query.all()
    return [SettingResponse.model_validate(s) for s in settings]


@router.get("/grouped", response_model=SettingsGroupResponse)
async def get_settings_grouped(
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get settings grouped by type"""
    all_settings = db.query(PlatformSetting).all()
    
    return SettingsGroupResponse(
        commission_settings=[SettingResponse.model_validate(s) for s in all_settings if s.setting_type == SettingType.COMMISSION],
        general_settings=[SettingResponse.model_validate(s) for s in all_settings if s.setting_type == SettingType.GENERAL],
        payment_settings=[SettingResponse.model_validate(s) for s in all_settings if s.setting_type == SettingType.PAYMENT],
        notification_settings=[SettingResponse.model_validate(s) for s in all_settings if s.setting_type == SettingType.NOTIFICATION]
    )


@router.post("/confirm")
async def confirm_setting_change(
    confirmation: SettingConfirmation,
    request: Request,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Update a critical setting with password confirmation
    
    Requires admin password verification for security.
    Creates audit log entry.
    """
    # Get setting
    setting = db.query(PlatformSetting).filter(
        PlatformSetting.setting_key == confirmation.setting_key
    ).first()
    
    if not setting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Setting '{confirmation.setting_key}' not found"
        )
    
    if not setting.is_editable:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This setting cannot be modified"
        )
    
    # Verify admin password
    if not verify_password(confirmation.password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect password"
        )
    
    # Validate new value
    validation_result = validate_setting_value(setting, confirmation.new_value)
    if not validation_result.is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid value: {', '.join(validation_result.errors)}"
        )
    
    # Get impact analysis
    impact = analyze_setting_impact(setting, confirmation.new_value, db)
    
    # Store old value
    old_value = setting.setting_value
    
    # Apply change
    setting.setting_value = confirmation.new_value
    setting.updated_by = current_user.id
    setting.updated_at = datetime.utcnow()
    
    # Create audit log
    ip_address = get_client_ip(request)
    user_agent = request.headers.get("user-agent", "unknown")
    
    create_audit_log(
        setting=setting,
        old_value=old_value,
        new_value=confirmation.new_value,
        admin_user=current_user,
        ip_address=ip_address,
        user_agent=user_agent,
        reason=confirmation.reason,
        db=db
    )
    
    db.commit()
    db.refresh(setting)
    
    return {
        "message": "Setting updated successfully",
        "setting": SettingResponse.model_validate(setting),
        "impact": impact
    }


@router.get("/audit-log", response_model=List[AuditLogResponse])
async def get_audit_log(
    setting_key: Optional[str] = None,
    limit: int = 100,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get audit log of setting changes"""
    query = db.query(SettingsAuditLog).order_by(SettingsAuditLog.created_at.desc())
    
    if setting_key:
        query = query.filter(SettingsAuditLog.setting_key == setting_key)
    
    audit_logs = query.limit(limit).all()
    
    # Add user names
    result = []
    for log in audit_logs:
        log_dict = AuditLogResponse.model_validate(log).model_dump()
        
        user = db.query(User).filter(User.id == log.changed_by).first()
        if user:
            log_dict["changed_by_name"] = f"{user.first_name} {user.last_name}" if user.first_name else user.email
        
        result.append(AuditLogResponse(**log_dict))
    
    return result
