from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from datetime import datetime
import secrets

from app.database import get_db
from app.models.user import User
from app.models.order import Order, OrderItem
from app.models.product import Product
from app.middleware.auth_middleware import get_current_user

router = APIRouter(prefix="/orders", tags=["Orders"])


@router.post("")
async def create_order(
    order_data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new order"""
    
    order_number = f"ORD-{secrets.token_hex(4).upper()}"
    
    try:
        # 1. Validate products and check inventory
        items_to_create = []
        
        for item in order_data['items']:
            product = db.query(Product).filter(
                Product.id == item['product_id']
            ).first()
            
            if not product or not product.is_active:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Product not available"
                )
            
            if product.quantity < item['quantity']:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Insufficient stock for {product.name}"
                )
            
            # Calculate fees
            subtotal = float(product.price) * item['quantity']
            seller = product.seller_profile
            platform_fee = subtotal * (seller.commission_rate / 100)
            seller_earning = subtotal - platform_fee
            
            items_to_create.append({
                "product": product,
                "seller_id": seller.id,
                "quantity": item['quantity'],
                "price": float(product.price),
                "subtotal": subtotal,
                "platform_fee": platform_fee,
                "seller_earning": seller_earning
            })
        
        # 2. Create order
        order = Order(
            order_number=order_number,
            buyer_id=current_user.id,
            status="pending",
            subtotal=order_data['subtotal'],
            shipping_cost=order_data['shipping_cost'],
            tax=order_data['tax'],
            total=order_data['total'],
            payment_method=order_data['payment_method'],
            payment_status="pending",
            shipping_address=order_data['shipping_address'],
            billing_address=order_data['billing_address']
        )
        
        db.add(order)
        db.flush()
        
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
                status="pending"
            )
            db.add(order_item)
            
            # Update inventory
            product = item_data["product"]
            product.quantity -= item_data["quantity"]
            product.sales_count += item_data["quantity"]
        
        db.commit()
        db.refresh(order)
        
        return order
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("", response_model=List)
async def get_user_orders(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all orders for current user"""
    orders = db.query(Order).filter(
        Order.buyer_id == current_user.id
    ).order_by(Order.created_at.desc()).all()
    
    return orders


@router.get("/{order_id}")
async def get_order_detail(
    order_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get detailed order information"""
    order = db.query(Order).filter(Order.id == order_id).first()
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if order.buyer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    return order


@router.put("/{order_id}/cancel")
async def cancel_order(
    order_id: str,
    cancel_data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Cancel an order"""
    order = db.query(Order).filter(Order.id == order_id).first()
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if order.buyer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    if order.status not in ["pending", "confirmed"]:
        raise HTTPException(
            status_code=400, 
            detail="Order cannot be cancelled at this stage"
        )
    
    order.status = "cancelled"
    order.cancelled_at = datetime.utcnow()
    order.cancelled_reason = cancel_data.get('reason', 'Cancelled by customer')
    
    # Restore inventory
    for item in order.items:
        product = db.query(Product).filter(
            Product.id == item.product_id
        ).first()
        if product:
            product.quantity += item.quantity
            product.sales_count -= item.quantity
        item.status = "cancelled"
    
    db.commit()
    db.refresh(order)
    
    return {"message": "Order cancelled successfully", "order": order}
