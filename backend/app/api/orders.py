from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
import secrets

from app.database import get_db
from app.models.user import User
from app.models.order import Order, OrderItem, OrderStatus, PaymentStatus
from app.models.product import Product
from app.models.seller import SellerProfile
from app.middleware.auth_middleware import get_current_user
from app.schemas.order import (
    OrderCreate,
    OrderResponse,
    OrderDetailResponse,
    OrderCancelRequest
)

router = APIRouter(prefix="/orders", tags=["Orders"])


@router.get("/track")
async def track_order(
    order_number: str,
    email: str,
    db: Session = Depends(get_db)
):
    """
    Public endpoint to track an order
    
    Requires order number and email address for verification
    Does not require authentication
    """
    # Find order by order number
    order = db.query(Order).filter(
        Order.order_number == order_number.upper().strip()
    ).first()
    
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found. Please check your order number."
        )
    
    # Verify email matches
    if order.buyer.email.lower() != email.lower().strip():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email address does not match order records."
        )
    
    # Return order information
    return {
        "order_number": order.order_number,
        "status": order.status,
        "payment_status": order.payment_status,
        "tracking_number": order.tracking_number,
        "created_at": order.created_at.isoformat(),
        "updated_at": order.updated_at.isoformat() if order.updated_at else None,
        "total": float(order.total),
        "shipping_address": order.shipping_address,
        "items": [
            {
                "product_name": item.product_name,
                "quantity": item.quantity,
                "price": float(item.price),
                "subtotal": float(item.subtotal),
                "status": item.status
            }
            for item in order.items
        ]
    }


@router.post("", response_model=OrderDetailResponse, status_code=status.HTTP_201_CREATED)
async def create_order(
    order_data: OrderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new order
    
    - Validates product availability and stock
    - Creates order with items
    - Updates product inventory
    - Calculates platform fees and seller earnings
    """
    
    order_number = f"ORD-{secrets.token_hex(4).upper()}"
    
    try:
        # 1. Validate products and check inventory
        items_to_create = []
        calculated_subtotal = 0
        
        for item in order_data.items:
            product = db.query(Product).filter(
                Product.id == item.product_id
            ).first()
            
            if not product or not product.is_active:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST, 
                    detail=f"Product with ID {item.product_id} is not available"
                )
            
            if product.quantity < item.quantity:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST, 
                    detail=f"Insufficient stock for {product.name}. Available: {product.quantity}"
                )
            
            # Get seller profile
            seller = db.query(SellerProfile).filter(
                SellerProfile.id == product.seller_id
            ).first()
            
            if not seller:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Seller not found for product {product.name}"
                )
            
            # Calculate fees
            item_subtotal = float(product.price) * item.quantity
            platform_fee = item_subtotal * (float(seller.commission_rate) / 100)
            seller_earning = item_subtotal - platform_fee
            
            calculated_subtotal += item_subtotal
            
            items_to_create.append({
                "product": product,
                "seller_id": seller.id,
                "quantity": item.quantity,
                "price": float(product.price),
                "subtotal": item_subtotal,
                "platform_fee": platform_fee,
                "seller_earning": seller_earning
            })
        
        # Verify the subtotal matches
        if abs(float(order_data.subtotal) - calculated_subtotal) > 0.01:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Subtotal mismatch. Please refresh and try again."
            )
        
        # Calculate total platform fee
        total_platform_fee = sum(item["platform_fee"] for item in items_to_create)
        
        # 2. Create order
        order = Order(
            order_number=order_number,
            buyer_id=current_user.id,
            status=OrderStatus.PENDING,
            payment_status=PaymentStatus.PENDING,
            subtotal=float(order_data.subtotal),
            platform_fee=total_platform_fee,
            shipping_cost=float(order_data.shipping_cost),
            tax=float(order_data.tax),
            total=float(order_data.total),
            payment_method=order_data.payment_method,
            shipping_address=order_data.shipping_address.model_dump(),
            billing_address=order_data.billing_address.model_dump() if order_data.billing_address else order_data.shipping_address.model_dump(),
            notes=order_data.notes
        )
        
        db.add(order)
        db.flush()  # Get order.id without committing
        
        # 3. Create order items and update inventory
        for item_data in items_to_create:
            order_item = OrderItem(
                order_id=order.id,
                product_id=item_data["product"].id,
                seller_id=item_data["seller_id"],
                product_name=item_data["product"].name,
                quantity=item_data["quantity"],
                price=item_data["price"],
                subtotal=item_data["subtotal"],
                platform_fee=item_data["platform_fee"],
                seller_earning=item_data["seller_earning"],
                status=OrderStatus.PENDING
            )
            db.add(order_item)
            
            # Update inventory
            product = item_data["product"]
            product.quantity -= item_data["quantity"]
            product.sales_count += item_data["quantity"]
        
        db.commit()
        db.refresh(order)
        
        return order
        
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Order creation failed: {str(e)}"
        )


@router.get("", response_model=List[OrderResponse])
async def get_user_orders(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all orders for the current user
    
    Returns orders sorted by creation date (newest first)
    """
    orders = db.query(Order).filter(
        Order.buyer_id == current_user.id
    ).order_by(Order.created_at.desc()).all()
    
    return orders


@router.get("/{order_id}", response_model=OrderDetailResponse)
async def get_order_detail(
    order_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get detailed information about a specific order
    
    Only the buyer who created the order can access it
    """
    order = db.query(Order).filter(Order.id == order_id).first()
    
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )
    
    if str(order.buyer_id) != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to access this order"
        )
    
    return order


@router.put("/{order_id}/cancel")
async def cancel_order(
    order_id: str,
    cancel_data: OrderCancelRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Cancel an order
    
    - Only pending or confirmed orders can be cancelled
    - Restores product inventory
    - Records cancellation reason
    """
    order = db.query(Order).filter(Order.id == order_id).first()
    
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )
    
    if str(order.buyer_id) != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to cancel this order"
        )
    
    if order.status not in [OrderStatus.PENDING, OrderStatus.CONFIRMED]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail=f"Orders with status '{order.status}' cannot be cancelled. Only pending or confirmed orders can be cancelled."
        )
    
    # Update order status
    order.status = OrderStatus.CANCELLED
    order.cancelled_at = datetime.utcnow()
    order.cancelled_reason = cancel_data.reason
    
    # Restore inventory and update item status
    for item in order.items:
        product = db.query(Product).filter(
            Product.id == item.product_id
        ).first()
        if product:
            product.quantity += item.quantity
            product.sales_count = max(0, product.sales_count - item.quantity)
        item.status = OrderStatus.CANCELLED
    
    db.commit()
    
    return {
        "message": "Order cancelled successfully",
        "order_id": str(order.id),
        "order_number": order.order_number
    }
