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
from app.models.order import OrderItem, Order
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


# === ORDER MANAGEMENT ENDPOINTS ===

@router.get("/orders")
async def get_seller_orders(
    current_user: User = Depends(get_current_seller),
    db: Session = Depends(get_db)
):
    """Get all order items for seller's products"""
    
    profile = current_user.seller_profile
    
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Seller profile not found"
        )
    
    # Get all order items for this seller
    order_items = db.query(OrderItem).filter(
        OrderItem.seller_id == profile.id
    ).order_by(OrderItem.created_at.desc()).all()
    
    return order_items


@router.put("/orders/{order_item_id}/status")
async def update_order_status(
    order_item_id: str,
    status_data: dict,
    current_user: User = Depends(get_current_seller),
    db: Session = Depends(get_db)
):
    """Update order item status"""
    
    profile = current_user.seller_profile
    
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Seller profile not found"
        )
    
    # Get order item
    order_item = db.query(OrderItem).filter(
        OrderItem.id == order_item_id
    ).first()
    
    if not order_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order item not found"
        )
    
    # Verify ownership
    if order_item.seller_id != profile.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    new_status = status_data.get('status')
    tracking_number = status_data.get('tracking_number')
    
    # Validate status transition
    valid_transitions = {
        'pending': ['confirmed', 'cancelled'],
        'confirmed': ['processing', 'cancelled'],
        'processing': ['shipped'],
        'shipped': ['delivered'],
    }
    
    if new_status not in valid_transitions.get(order_item.status, []):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot transition from {order_item.status} to {new_status}"
        )
    
    # Update status
    order_item.status = new_status
    order = order_item.order
    
    # If shipping, tracking number is required
    if new_status == "shipped":
        if not tracking_number:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Tracking number is required for shipped status"
            )
        order.tracking_number = tracking_number
    
    # Update main order status if all items have same status
    all_items_status = [item.status for item in order.items]
    if len(set(all_items_status)) == 1:
        order.status = new_status
    elif new_status == "cancelled":
        # At least one item cancelled
        if all(s == "cancelled" for s in all_items_status):
            order.status = "cancelled"
    
    db.commit()
    db.refresh(order_item)
    
    return {
        "message": f"Order item status updated to {new_status}",
        "order_item": order_item
    }
