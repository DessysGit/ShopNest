from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.seller import SellerProfileResponse, SellerApprovalAction
from app.models.seller import SellerProfile, ApprovalStatus
from app.models.user import User
from app.middleware.auth_middleware import get_current_admin
from typing import List
from datetime import datetime

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get("/sellers/pending", response_model=List[SellerProfileResponse])
async def get_pending_sellers(
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get all pending seller applications"""
    
    pending_sellers = db.query(SellerProfile).filter(
        SellerProfile.approval_status == ApprovalStatus.PENDING
    ).all()
    
    return [SellerProfileResponse.model_validate(seller) for seller in pending_sellers]


@router.get("/sellers/all", response_model=List[SellerProfileResponse])
async def get_all_sellers(
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get all sellers (all statuses)"""
    
    sellers = db.query(SellerProfile).all()
    
    return [SellerProfileResponse.model_validate(seller) for seller in sellers]


@router.post("/sellers/{seller_id}/approval")
async def approve_or_reject_seller(
    seller_id: str,
    action_data: SellerApprovalAction,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Approve or reject a seller application"""
    
    # Get seller profile
    seller = db.query(SellerProfile).filter(
        SellerProfile.id == seller_id
    ).first()
    
    if not seller:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Seller profile not found"
        )
    
    # Check if already processed
    if seller.approval_status != ApprovalStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Seller is already {seller.approval_status.value}"
        )
    
    # Update approval status
    if action_data.action == "approve":
        seller.approval_status = ApprovalStatus.APPROVED
        seller.approval_date = datetime.utcnow()
        seller.approved_by = current_user.id
        message = "Seller approved successfully"
    else:  # reject
        if not action_data.rejection_reason:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Rejection reason is required"
            )
        seller.approval_status = ApprovalStatus.REJECTED
        seller.rejection_reason = action_data.rejection_reason
        seller.approved_by = current_user.id
        message = "Seller rejected"
    
    db.commit()
    db.refresh(seller)
    
    return {
        "message": message,
        "seller": SellerProfileResponse.model_validate(seller)
    }


@router.put("/sellers/{seller_id}/suspend")
async def suspend_seller(
    seller_id: str,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Suspend an approved seller"""
    
    seller = db.query(SellerProfile).filter(
        SellerProfile.id == seller_id
    ).first()
    
    if not seller:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Seller profile not found"
        )
    
    if seller.approval_status != ApprovalStatus.APPROVED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only approved sellers can be suspended"
        )
    
    seller.approval_status = ApprovalStatus.SUSPENDED
    db.commit()
    db.refresh(seller)
    
    return {
        "message": "Seller suspended successfully",
        "seller": SellerProfileResponse.model_validate(seller)
    }


@router.put("/sellers/{seller_id}/reactivate")
async def reactivate_seller(
    seller_id: str,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Reactivate a suspended seller"""
    
    seller = db.query(SellerProfile).filter(
        SellerProfile.id == seller_id
    ).first()
    
    if not seller:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Seller profile not found"
        )
    
    if seller.approval_status != ApprovalStatus.SUSPENDED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only suspended sellers can be reactivated"
        )
    
    seller.approval_status = ApprovalStatus.APPROVED
    db.commit()
    db.refresh(seller)
    
    return {
        "message": "Seller reactivated successfully",
        "seller": SellerProfileResponse.model_validate(seller)
    }


@router.get("/dashboard")
async def get_admin_dashboard(
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get admin dashboard statistics"""
    
    total_sellers = db.query(SellerProfile).count()
    pending_sellers = db.query(SellerProfile).filter(
        SellerProfile.approval_status == ApprovalStatus.PENDING
    ).count()
    approved_sellers = db.query(SellerProfile).filter(
        SellerProfile.approval_status == ApprovalStatus.APPROVED
    ).count()
    rejected_sellers = db.query(SellerProfile).filter(
        SellerProfile.approval_status == ApprovalStatus.REJECTED
    ).count()
    suspended_sellers = db.query(SellerProfile).filter(
        SellerProfile.approval_status == ApprovalStatus.SUSPENDED
    ).count()
    
    from app.models.user import User
    total_users = db.query(User).count()
    
    return {
        "users": {
            "total": total_users
        },
        "sellers": {
            "total": total_sellers,
            "pending": pending_sellers,
            "approved": approved_sellers,
            "rejected": rejected_sellers,
            "suspended": suspended_sellers
        },
        "products": {
            "total": 0,  # Will implement later
            "active": 0
        },
        "orders": {
            "total": 0,  # Will implement later
            "pending": 0,
            "completed": 0
        }
    }
