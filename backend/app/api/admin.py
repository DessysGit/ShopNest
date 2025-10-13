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


@router.get("/revenue/detailed")
async def get_detailed_revenue(
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Get detailed revenue analytics for the platform
    
    This endpoint provides comprehensive revenue insights including:
    - Total platform earnings (commission from all completed orders)
    - Revenue trends by month
    - Top earning sellers
    - Revenue by product category
    - Payment method breakdown
    
    Only accessible by admin users.
    """
    
    from app.models.order import OrderItem
    from app.models.product import Product
    from sqlalchemy import func, extract
    from datetime import datetime, timedelta
    
    # ============= OVERALL REVENUE METRICS =============
    # Calculate total platform revenue from completed orders only
    # We only count orders that are confirmed, processing, shipped, or delivered
    total_platform_revenue = db.query(
        func.sum(OrderItem.platform_fee)
    ).filter(
        OrderItem.status.in_(['confirmed', 'processing', 'shipped', 'delivered'])
    ).scalar() or 0.0
    
    # ============= REVENUE BY MONTH (Last 12 months) =============
    # Get revenue breakdown by month for trend analysis
    current_date = datetime.utcnow()
    monthly_revenue = []
    
    for i in range(12):
        # Calculate the target month
        target_date = current_date - timedelta(days=30*i)
        month = target_date.month
        year = target_date.year
        
        # Query revenue for this month
        month_revenue = db.query(
            func.sum(OrderItem.platform_fee)
        ).filter(
            extract('month', OrderItem.created_at) == month,
            extract('year', OrderItem.created_at) == year,
            OrderItem.status.in_(['confirmed', 'processing', 'shipped', 'delivered'])
        ).scalar() or 0.0
        
        monthly_revenue.append({
            "month": target_date.strftime("%B %Y"),
            "revenue": round(float(month_revenue), 2)
        })
    
    # Reverse to show oldest to newest
    monthly_revenue.reverse()
    
    # ============= TOP EARNING SELLERS =============
    # Find sellers who generated the most commission for the platform
    top_sellers = db.query(
        SellerProfile.id,
        SellerProfile.business_name,
        func.sum(OrderItem.platform_fee).label('total_commission'),
        func.count(OrderItem.id).label('order_count')
    ).join(
        OrderItem, SellerProfile.id == OrderItem.seller_id
    ).filter(
        OrderItem.status.in_(['confirmed', 'processing', 'shipped', 'delivered'])
    ).group_by(
        SellerProfile.id,
        SellerProfile.business_name
    ).order_by(
        func.sum(OrderItem.platform_fee).desc()
    ).limit(10).all()
    
    top_sellers_list = [
        {
            "seller_id": str(seller.id),
            "business_name": seller.business_name,
            "commission_generated": round(float(seller.total_commission), 2),
            "total_orders": seller.order_count
        }
        for seller in top_sellers
    ]
    
    # ============= REVENUE BY PAYMENT METHOD =============
    # Break down revenue by how customers paid
    from app.models.order import Order
    
    payment_methods = db.query(
        Order.payment_method,
        func.sum(OrderItem.platform_fee).label('revenue')
    ).join(
        OrderItem, Order.id == OrderItem.order_id
    ).filter(
        OrderItem.status.in_(['confirmed', 'processing', 'shipped', 'delivered'])
    ).group_by(
        Order.payment_method
    ).all()
    
    payment_breakdown = {
        method or 'Unknown': round(float(revenue), 2)
        for method, revenue in payment_methods
    }
    
    # ============= TOTAL TRANSACTIONS =============
    total_transactions = db.query(OrderItem).filter(
        OrderItem.status.in_(['confirmed', 'processing', 'shipped', 'delivered'])
    ).count()
    
    # ============= AVERAGE COMMISSION PER TRANSACTION =============
    avg_commission = (
        float(total_platform_revenue) / total_transactions 
        if total_transactions > 0 
        else 0.0
    )
    
    return {
        "summary": {
            "total_platform_revenue": round(float(total_platform_revenue), 2),
            "total_transactions": total_transactions,
            "average_commission_per_transaction": round(avg_commission, 2)
        },
        "monthly_revenue": monthly_revenue,
        "top_sellers": top_sellers_list,
        "payment_method_breakdown": payment_breakdown
    }


@router.get("/dashboard")
async def get_admin_dashboard(
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Get comprehensive admin dashboard statistics
    
    Returns:
    - User statistics (total users, buyers, sellers)
    - Seller statistics (total, pending, approved, rejected, suspended)
    - Product statistics (total, active, inactive)
    - Order statistics (total, by status)
    - Revenue statistics (platform earnings, total sales, commission breakdown)
    """
    
    from app.models.product import Product
    from app.models.order import Order, OrderItem
    from sqlalchemy import func
    
    # ============= USER STATISTICS =============
    total_users = db.query(User).count()
    
    # ============= SELLER STATISTICS =============
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
    
    # ============= PRODUCT STATISTICS =============
    total_products = db.query(Product).count()
    active_products = db.query(Product).filter(
        Product.is_active == True
    ).count()
    
    # ============= ORDER STATISTICS =============
    total_orders = db.query(Order).count()
    pending_orders = db.query(Order).filter(
        Order.status == 'pending'
    ).count()
    completed_orders = db.query(Order).filter(
        Order.status == 'delivered'
    ).count()
    
    # ============= REVENUE STATISTICS =============
    # Calculate platform revenue from order items
    # Platform earns commission (platform_fee) from each order item
    
    # Total platform revenue (sum of all platform fees from all orders)
    platform_revenue_result = db.query(
        func.sum(OrderItem.platform_fee)
    ).filter(
        OrderItem.status.in_(['delivered', 'shipped', 'confirmed', 'processing'])
    ).scalar()
    
    platform_revenue = float(platform_revenue_result) if platform_revenue_result else 0.0
    
    # Total seller earnings (sum of all seller earnings from all orders)
    seller_earnings_result = db.query(
        func.sum(OrderItem.seller_earning)
    ).filter(
        OrderItem.status.in_(['delivered', 'shipped', 'confirmed', 'processing'])
    ).scalar()
    
    seller_earnings = float(seller_earnings_result) if seller_earnings_result else 0.0
    
    # Total sales volume (platform revenue + seller earnings)
    total_sales = platform_revenue + seller_earnings
    
    # Revenue breakdown by order status
    revenue_by_status = {}
    for order_status in ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled']:
        status_revenue = db.query(
            func.sum(OrderItem.platform_fee)
        ).filter(
            OrderItem.status == order_status
        ).scalar()
        revenue_by_status[order_status] = float(status_revenue) if status_revenue else 0.0
    
    # Calculate average commission rate
    # This shows the average percentage the platform earns
    if total_sales > 0:
        avg_commission_rate = (platform_revenue / total_sales) * 100
    else:
        avg_commission_rate = 0.0
    
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
            "total": total_products,
            "active": active_products,
            "inactive": total_products - active_products
        },
        "orders": {
            "total": total_orders,
            "pending": pending_orders,
            "completed": completed_orders
        },
        "revenue": {
            "platform_revenue": round(platform_revenue, 2),  # What the platform earned
            "seller_earnings": round(seller_earnings, 2),     # What sellers earned
            "total_sales": round(total_sales, 2),             # Total transaction volume
            "avg_commission_rate": round(avg_commission_rate, 2),  # Average commission %
            "revenue_by_status": revenue_by_status            # Revenue breakdown by order status
        }
    }
