from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.user import UserCreate, UserLogin, TokenResponse, UserResponse, RefreshTokenRequest, PasswordResetRequest, PasswordResetConfirm, PasswordChange
from app.models.user import User, PasswordResetToken
from app.middleware.auth_middleware import get_current_user
from app.utils.security import (
    get_password_hash,
    verify_password,
    create_access_token,
    create_refresh_token,
    verify_token
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserCreate, db: Session = Depends(get_db)):
    """Register a new user"""
    
    try:
        # Check if email already exists
        existing_user = db.query(User).filter(User.email == user_data.email).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        # Create new user
        hashed_password = get_password_hash(user_data.password)
        new_user = User(
            email=user_data.email,
            password_hash=hashed_password,
            first_name=user_data.first_name,
            last_name=user_data.last_name,
            phone=user_data.phone,
            role=user_data.role
        )
        
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        
        # Send welcome email
        from app.services.email_service import email_service
        user_name = f"{new_user.first_name or ''} {new_user.last_name or ''}".strip() or new_user.email.split('@')[0]
        try:
            await email_service.send_welcome_email(
                to_email=new_user.email,
                user_name=user_name
            )
        except Exception as e:
            print(f"Failed to send welcome email: {e}")
            # Don't fail registration if email fails
        
        # Generate tokens
        access_token = create_access_token(data={"sub": str(new_user.id), "role": new_user.role})
        refresh_token = create_refresh_token(data={"sub": str(new_user.id)})
        
        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            user=UserResponse.model_validate(new_user)
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"Registration error: {str(e)}")
        print(f"Error type: {type(e).__name__}")
        import traceback
        traceback.print_exc()
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Registration failed: {str(e)}"
        )


@router.post("/login", response_model=TokenResponse)
async def login(credentials: UserLogin, db: Session = Depends(get_db)):
    """Login with email and password"""
    
    # Find user by email
    user = db.query(User).filter(User.email == credentials.email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    # Verify password
    if not verify_password(credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    # Check if user is active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated"
        )
    
    # Generate tokens
    access_token = create_access_token(data={"sub": str(user.id), "role": user.role})
    refresh_token = create_refresh_token(data={"sub": str(user.id)})
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserResponse.model_validate(user)
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(token_data: RefreshTokenRequest, db: Session = Depends(get_db)):
    """Refresh access token using refresh token"""
    
    # Verify refresh token
    payload = verify_token(token_data.refresh_token, token_type="refresh")
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token"
        )
    
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload"
        )
    
    # Get user
    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive"
        )
    
    # Generate new tokens
    access_token = create_access_token(data={"sub": str(user.id), "role": user.role})
    new_refresh_token = create_refresh_token(data={"sub": str(user.id)})
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=new_refresh_token,
        user=UserResponse.model_validate(user)
    )


@router.post("/forgot-password")
async def forgot_password(request_data: PasswordResetRequest, db: Session = Depends(get_db)):
    """
    Request password reset email
    
    Generates a reset token and sends it via email.
    """
    from app.services.email_service import email_service
    
    # Find user by email
    user = db.query(User).filter(User.email == request_data.email).first()
    
    # Don't reveal if email exists or not (security best practice)
    # Always return success message
    response_message = "If your email is registered, you will receive a password reset link shortly."
    
    if not user:
        # Still return success to prevent email enumeration
        return {"message": response_message}
    
    # Generate reset token
    import secrets
    from datetime import datetime, timedelta, timezone
    
    reset_token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(hours=1)  # Token valid for 1 hour
    
    # Invalidate any existing tokens for this user
    db.query(PasswordResetToken).filter(
        PasswordResetToken.user_id == user.id,
        PasswordResetToken.is_used == False
    ).update({"is_used": True})
    
    # Create new reset token
    reset_token_record = PasswordResetToken(
        user_id=user.id,
        token=reset_token,
        expires_at=expires_at
    )
    
    db.add(reset_token_record)
    db.commit()
    
    # Send email with reset link
    user_name = f"{user.first_name or ''} {user.last_name or ''}".strip() or None
    try:
        await email_service.send_password_reset_email(
            to_email=user.email,
            reset_token=reset_token,
            user_name=user_name
        )
    except Exception as e:
        print(f"Failed to send reset email: {e}")
        # Don't fail the request if email fails
    
    return {"message": response_message}


@router.post("/reset-password")
async def reset_password(reset_data: PasswordResetConfirm, db: Session = Depends(get_db)):
    """
    Reset password using token from email
    
    Validates token and updates user's password.
    """
    from datetime import datetime, timezone
    
    # Find token
    token_record = db.query(PasswordResetToken).filter(
        PasswordResetToken.token == reset_data.token,
        PasswordResetToken.is_used == False
    ).first()
    
    if not token_record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token"
        )
    
    # Check if token is expired
    if datetime.now(timezone.utc) > token_record.expires_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reset token has expired. Please request a new one."
        )
    
    # Get user
    user = db.query(User).filter(User.id == token_record.user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Update password
    user.password_hash = get_password_hash(reset_data.new_password)
    
    # Mark token as used
    token_record.is_used = True
    
    db.commit()
    
    # TODO: Send confirmation email
    # send_password_changed_email(user.email)
    
    return {
        "message": "Password has been reset successfully. You can now login with your new password."
    }


@router.post("/change-password")
async def change_password(
    password_data: PasswordChange,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Change password when logged in
    
    Requires current password for security.
    """
    
    # Verify current password
    if not verify_password(password_data.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )
    
    # Check if new password is different from current
    if password_data.current_password == password_data.new_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be different from current password"
        )
    
    # Update password
    current_user.password_hash = get_password_hash(password_data.new_password)
    db.commit()
    
    # TODO: Send confirmation email
    # send_password_changed_email(current_user.email)
    
    return {
        "message": "Password changed successfully"
    }
