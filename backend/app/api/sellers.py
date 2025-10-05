from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.seller import (
    SellerProfileCreate, 
    SellerProfileUpdate, 
    SellerProfileResponse
)
from app.models.seller import SellerProfile, ApprovalStatus
from app.models.user import User
from app.middleware.auth_middleware import get_current_user, get_current_seller
from typing import List

router = APIRouter(prefix="/sellers", tags=["Sellers"])


@router.post("/profile", response_model=SellerProfileResponse, status_code=status.HTTP_201_CREATED)
async def create_seller_profile(
    profile_data: SellerProfileCreate,
    current_user: User = Depends(get_current_seller),
    db: Session = Depends(get_db)
):
    """Create a seller profile (seller must register as 'seller' role first)"""
    
    # Check if profile already exists
    existing_profile = db.query(SellerProfile).filter(
        SellerProfile.user_id == current_user.id
    ).first()
    
    if existing_profile:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Seller profile already exists"
        )
    
    # Create new seller profile
    new_profile = SellerProfile(
        user_id=current_user.id,
        business_name=profile_data.business_name,
        business_description=profile_data.business_description,
        business_address=profile_data.business_address,
        tax_id=profile_data.tax_id,
        approval_status=ApprovalStatus.PENDING
    )
    
    db.add(new_profile)
    db.commit()
    db.refresh(new_profile)
    
    return SellerProfileResponse.model_validate(new_profile)


@router.get("/profile", response_model=SellerProfileResponse)
async def get_seller_profile(
    current_user: User = Depends(get_current_seller),
    db: Session = Depends(get_db)
):
    """Get the current seller's profile"""
    
    profile = db.query(SellerProfile).filter(
        SellerProfile.user_id == current_user.id
    ).first()
    
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Seller profile not found. Please create one first."
        )
    
    return SellerProfileResponse.model_validate(profile)


@router.put("/profile", response_model=SellerProfileResponse)
async def update_seller_profile(
    profile_data: SellerProfileUpdate,
    current_user: User = Depends(get_current_seller),
    db: Session = Depends(get_db)
):
    """Update the current seller's profile"""
    
    profile = db.query(SellerProfile).filter(
        SellerProfile.user_id == current_user.id
    ).first()
    
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Seller profile not found. Please create one first."
        )
    
    # Update only provided fields
    update_data = profile_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(profile, field, value)
    
    db.commit()
    db.refresh(profile)
    
    return SellerProfileResponse.model_validate(profile)


@router.get("/profile/{seller_id}", response_model=SellerProfileResponse)
async def get_seller_profile_by_id(
    seller_id: str,
    db: Session = Depends(get_db)
):
    """Get a seller's public profile by ID"""
    
    profile = db.query(SellerProfile).filter(
        SellerProfile.id == seller_id
    ).first()
    
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Seller profile not found"
        )
    
    # Only show approved sellers to public
    if profile.approval_status != ApprovalStatus.APPROVED:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Seller profile not found"
        )
    
    return SellerProfileResponse.model_validate(profile)


@router.get("/dashboard")
async def get_seller_dashboard(
    current_user: User = Depends(get_current_seller),
    db: Session = Depends(get_db)
):
    """Get seller dashboard stats"""
    
    profile = db.query(SellerProfile).filter(
        SellerProfile.user_id == current_user.id
    ).first()
    
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Seller profile not found"
        )
    
    # TODO: Add product count, order stats when products/orders are implemented
    return {
        "profile": SellerProfileResponse.model_validate(profile),
        "stats": {
            "total_products": 0,  # Will be implemented later
            "total_orders": 0,
            "pending_orders": 0,
            "total_sales": float(profile.total_sales),
            "rating": float(profile.rating_average),
            "total_reviews": profile.total_reviews
        }
    }
