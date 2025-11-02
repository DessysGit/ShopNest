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
    
    from app.models.product import Product
    from sqlalchemy import func
    
    profile = db.query(SellerProfile).filter(
        SellerProfile.user_id == current_user.id
    ).first()
    
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Seller profile not found"
        )
    
    # Get product count
    total_products = db.query(Product).filter(
        Product.seller_id == profile.id
    ).count()
    
    # Get order stats
    total_orders = db.query(OrderItem).filter(
        OrderItem.seller_id == profile.id
    ).count()
    
    pending_orders = db.query(OrderItem).filter(
        OrderItem.seller_id == profile.id,
        OrderItem.status == 'pending'
    ).count()
    
    # Calculate total sales from order items
    total_sales_result = db.query(func.sum(OrderItem.seller_earning)).filter(
        OrderItem.seller_id == profile.id,
        OrderItem.status.in_(['delivered', 'shipped', 'confirmed', 'processing'])
    ).scalar()
    
    total_sales = float(total_sales_result) if total_sales_result else 0.0
    
    return {
        "profile": SellerProfileResponse.model_validate(profile),
        "stats": {
            "total_products": total_products,
            "total_orders": total_orders,
            "pending_orders": pending_orders,
            "total_sales": total_sales,
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
    """Get all order items for seller's products with full order details"""
    
    # Query seller profile from database to ensure it's loaded
    profile = db.query(SellerProfile).filter(
        SellerProfile.user_id == current_user.id
    ).first()
    
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Seller profile not found. Please create a seller profile first."
        )
    
    # Get all order items for this seller with order details
    order_items = db.query(OrderItem).filter(
        OrderItem.seller_id == profile.id
    ).order_by(OrderItem.created_at.desc()).all()
    
    # Format response with full details
    result = []
    for item in order_items:
        order = item.order
        buyer = order.buyer
        
        result.append({
            "id": str(item.id),
            "order_id": str(order.id),
            "order_number": order.order_number,
            "product_id": str(item.product_id),
            "product_name": item.product_name,
            "quantity": item.quantity,
            "price": float(item.price),
            "subtotal": float(item.subtotal),
            "platform_fee": float(item.platform_fee),
            "seller_earning": float(item.seller_earning),
            "status": item.status,
            "created_at": item.created_at.isoformat(),
            # Order details
            "order_status": order.status,
            "payment_status": order.payment_status,
            "tracking_number": order.tracking_number,
            # Buyer information
            "buyer": {
                "id": str(buyer.id),
                "email": buyer.email,
                "full_name": f"{buyer.first_name or ''} {buyer.last_name or ''}".strip() or "N/A",
                "phone": buyer.phone
            },
            # Shipping address
            "shipping_address": order.shipping_address,
            "billing_address": order.billing_address,
            "notes": order.notes
        })
    
    return result


@router.get("/orders/{order_item_id}")
async def get_seller_order_detail(
    order_item_id: str,
    current_user: User = Depends(get_current_seller),
    db: Session = Depends(get_db)
):
    """Get detailed information about a specific order item"""
    
    # Query seller profile
    profile = db.query(SellerProfile).filter(
        SellerProfile.user_id == current_user.id
    ).first()
    
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Seller profile not found. Please create a seller profile first."
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
    
    # Get full order details
    order = order_item.order
    buyer = order.buyer
    
    return {
        "id": str(order_item.id),
        "order_id": str(order.id),
        "order_number": order.order_number,
        "product_id": str(order_item.product_id),
        "product_name": order_item.product_name,
        "quantity": order_item.quantity,
        "price": float(order_item.price),
        "subtotal": float(order_item.subtotal),
        "platform_fee": float(order_item.platform_fee),
        "seller_earning": float(order_item.seller_earning),
        "status": order_item.status,
        "created_at": order_item.created_at.isoformat(),
        "updated_at": order_item.updated_at.isoformat() if order_item.updated_at else None,
        # Full order details
        "order_status": order.status,
        "payment_status": order.payment_status,
        "payment_method": order.payment_method,
        "tracking_number": order.tracking_number,
        "notes": order.notes,
        # Buyer information
        "buyer": {
            "id": str(buyer.id),
            "email": buyer.email,
            "full_name": f"{buyer.first_name or ''} {buyer.last_name or ''}".strip() or "N/A",
            "first_name": buyer.first_name,
            "last_name": buyer.last_name,
            "phone": buyer.phone
        },
        # Shipping and billing addresses
        "shipping_address": order.shipping_address,
        "billing_address": order.billing_address,
        # All items in this order (for context)
        "all_order_items": [
            {
                "id": str(item.id),
                "product_name": item.product_name,
                "quantity": item.quantity,
                "seller_id": str(item.seller_id),
                "status": item.status
            }
            for item in order.items
        ]
    }


@router.put("/orders/{order_item_id}/status")
async def update_order_status(
    order_item_id: str,
    status_data: dict,
    current_user: User = Depends(get_current_seller),
    db: Session = Depends(get_db)
):
    """Update order item status"""
    
    # Query seller profile from database to ensure it's loaded
    profile = db.query(SellerProfile).filter(
        SellerProfile.user_id == current_user.id
    ).first()
    
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Seller profile not found. Please create a seller profile first."
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
    buyer = order.buyer
    
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
    db.refresh(order)
    
    # Send status update email to customer
    from app.services.email_service import email_service
    customer_name = f"{buyer.first_name or ''} {buyer.last_name or ''}".strip() or "Customer"
    
    try:
        await email_service.send_order_status_update_email(
            to_email=buyer.email,
            customer_name=customer_name,
            order_number=order.order_number,
            order_id=str(order.id),
            new_status=new_status,
            tracking_number=tracking_number if new_status == 'shipped' else None
        )
    except Exception as e:
        print(f"Failed to send status update email: {e}")
    
    # Return complete order information
    return {
        "message": f"Order item status updated to {new_status}",
        "order_item": {
            "id": str(order_item.id),
            "order_id": str(order.id),
            "order_number": order.order_number,
            "product_name": order_item.product_name,
            "quantity": order_item.quantity,
            "price": float(order_item.price),
            "subtotal": float(order_item.subtotal),
            "status": order_item.status,
            "order_status": order.status,
            "payment_status": order.payment_status,
            "tracking_number": order.tracking_number,
            "buyer": {
                "email": buyer.email,
                "full_name": f"{buyer.first_name or ''} {buyer.last_name or ''}".strip() or "N/A",
                "phone": buyer.phone
            },
            "shipping_address": order.shipping_address
        }
    }
