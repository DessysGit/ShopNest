# Backend Implementation Template

## Quick Start Guide for Backend APIs

This template provides starter code for implementing the required backend endpoints.

---

## 1. Admin Seller Management APIs

### File: `backend/app/api/admin.py`

```python
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from datetime import datetime

from app.database import get_db
from app.models.user import User
from app.models.seller import SellerProfile
from app.schemas.seller import SellerResponse
from app.utils.auth import get_current_user, require_admin

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/sellers/all", response_model=List[SellerResponse])
async def get_all_sellers(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Get all sellers with their profiles"""
    sellers = db.query(SellerProfile).join(User).all()
    return sellers


@router.post("/sellers/{seller_id}/approval")
async def approve_reject_seller(
    seller_id: UUID,
    action: str,
    rejection_reason: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Approve or reject seller application"""
    seller = db.query(SellerProfile).filter(SellerProfile.id == seller_id).first()
    
    if not seller:
        raise HTTPException(status_code=404, detail="Seller not found")
    
    if action == "approve":
        seller.approval_status = "approved"
        seller.approval_date = datetime.utcnow()
        seller.approved_by = current_user.id
        seller.rejection_reason = None
        message = "Seller approved successfully"
        
        # TODO: Send approval email to seller
        
    elif action == "reject":
        if not rejection_reason:
            raise HTTPException(
                status_code=400, 
                detail="Rejection reason is required"
            )
        seller.approval_status = "rejected"
        seller.approval_date = datetime.utcnow()
        seller.approved_by = current_user.id
        seller.rejection_reason = rejection_reason
        message = "Seller rejected"
        
        # TODO: Send rejection email to seller
        
    else:
        raise HTTPException(status_code=400, detail="Invalid action")
    
    db.commit()
    db.refresh(seller)
    
    return {"message": message, "seller": seller}


@router.put("/sellers/{seller_id}/suspend")
async def suspend_seller(
    seller_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Suspend an approved seller"""
    seller = db.query(SellerProfile).filter(SellerProfile.id == seller_id).first()
    
    if not seller:
        raise HTTPException(status_code=404, detail="Seller not found")
    
    if seller.approval_status != "approved":
        raise HTTPException(
            status_code=400, 
            detail="Only approved sellers can be suspended"
        )
    
    seller.approval_status = "suspended"
    db.commit()
    
    # TODO: Send suspension notification to seller
    # TODO: Deactivate all seller's products
    
    return {"message": "Seller suspended successfully"}


@router.put("/sellers/{seller_id}/reactivate")
async def reactivate_seller(
    seller_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Reactivate a suspended seller"""
    seller = db.query(SellerProfile).filter(SellerProfile.id == seller_id).first()
    
    if not seller:
        raise HTTPException(status_code=404, detail="Seller not found")
    
    if seller.approval_status != "suspended":
        raise HTTPException(
            status_code=400, 
            detail="Only suspended sellers can be reactivated"
        )
    
    seller.approval_status = "approved"
    db.commit()
    
    # TODO: Send reactivation notification to seller
    
    return {"message": "Seller reactivated successfully"}
```

---

## 2. Order Management APIs

### File: `backend/app/api/orders.py`

```python
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
from app.schemas.order import OrderCreate, OrderResponse
from app.utils.auth import get_current_user

router = APIRouter(prefix="/orders", tags=["orders"])


@router.post("", response_model=OrderResponse)
async def create_order(
    order_data: OrderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new order"""
    
    # Generate unique order number
    order_number = f"ORD-{secrets.token_hex(4).upper()}"
    
    # Start transaction
    try:
        # 1. Validate all products and check inventory
        items_to_create = []
        total_subtotal = 0
        
        for item in order_data.items:
            product = db.query(Product).filter(Product.id == item.product_id).first()
            
            if not product:
                raise HTTPException(
                    status_code=404, 
                    detail=f"Product {item.product_id} not found"
                )
            
            if not product.is_active:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Product {product.name} is not available"
                )
            
            if product.quantity < item.quantity:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Insufficient stock for {product.name}"
                )
            
            # Calculate fees
            subtotal = float(product.price) * item.quantity
            seller = product.seller_profile
            platform_fee = subtotal * (seller.commission_rate / 100)
            seller_earning = subtotal - platform_fee
            
            items_to_create.append({
                "product": product,
                "seller_id": seller.id,
                "quantity": item.quantity,
                "price": float(product.price),
                "subtotal": subtotal,
                "platform_fee": platform_fee,
                "seller_earning": seller_earning
            })
            
            total_subtotal += subtotal
        
        # 2. Create order
        order = Order(
            order_number=order_number,
            buyer_id=current_user.id,
            status="pending",
            subtotal=order_data.subtotal,
            shipping_cost=order_data.shipping_cost,
            tax=order_data.tax,
            total=order_data.total,
            payment_method=order_data.payment_method,
            payment_status="pending",
            shipping_address=order_data.shipping_address,
            billing_address=order_data.billing_address
        )
        
        db.add(order)
        db.flush()  # Get order ID
        
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
            
            # Update product inventory
            product = item_data["product"]
            product.quantity -= item_data["quantity"]
            product.sales_count += item_data["quantity"]
        
        db.commit()
        db.refresh(order)
        
        # TODO: Send notification to sellers
        # TODO: Send order confirmation email to buyer
        
        return order
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("", response_model=List[OrderResponse])
async def get_user_orders(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all orders for current user"""
    orders = db.query(Order).filter(
        Order.buyer_id == current_user.id
    ).order_by(Order.created_at.desc()).all()
    
    return orders


@router.get("/{order_id}", response_model=OrderResponse)
async def get_order_detail(
    order_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get detailed order information"""
    order = db.query(Order).filter(Order.id == order_id).first()
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Verify ownership
    if order.buyer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    return order


@router.put("/{order_id}/cancel")
async def cancel_order(
    order_id: UUID,
    reason: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Cancel an order"""
    order = db.query(Order).filter(Order.id == order_id).first()
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Verify ownership
    if order.buyer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Check if cancellable
    if order.status not in ["pending", "confirmed"]:
        raise HTTPException(
            status_code=400, 
            detail="Order cannot be cancelled at this stage"
        )
    
    # Update order status
    order.status = "cancelled"
    order.cancelled_at = datetime.utcnow()
    order.cancelled_reason = reason
    
    # Restore inventory for all items
    for item in order.items:
        product = db.query(Product).filter(Product.id == item.product_id).first()
        if product:
            product.quantity += item.quantity
            product.sales_count -= item.quantity
        
        item.status = "cancelled"
    
    db.commit()
    
    # TODO: Send cancellation notification to sellers
    # TODO: Process refund if payment was made
    
    return {"message": "Order cancelled successfully", "order": order}
```

---

## 3. Seller Order Management APIs

### File: `backend/app/api/sellers.py`

```python
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from app.database import get_db
from app.models.user import User
from app.models.order import OrderItem, Order
from app.schemas.order import OrderItemResponse
from app.utils.auth import get_current_user, require_seller

router = APIRouter(prefix="/sellers", tags=["sellers"])


@router.get("/orders", response_model=List[OrderItemResponse])
async def get_seller_orders(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_seller)
):
    """Get all order items for seller's products"""
    
    # Get seller profile
    seller_profile = current_user.seller_profile
    
    if not seller_profile:
        raise HTTPException(
            status_code=400, 
            detail="Seller profile not found"
        )
    
    # Get all order items for this seller
    order_items = db.query(OrderItem).filter(
        OrderItem.seller_id == seller_profile.id
    ).order_by(OrderItem.created_at.desc()).all()
    
    return order_items


@router.put("/orders/{order_item_id}/status")
async def update_order_status(
    order_item_id: UUID,
    status: str,
    tracking_number: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_seller)
):
    """Update order item status"""
    
    # Get seller profile
    seller_profile = current_user.seller_profile
    
    if not seller_profile:
        raise HTTPException(
            status_code=400, 
            detail="Seller profile not found"
        )
    
    # Get order item
    order_item = db.query(OrderItem).filter(
        OrderItem.id == order_item_id
    ).first()
    
    if not order_item:
        raise HTTPException(status_code=404, detail="Order item not found")
    
    # Verify ownership
    if order_item.seller_id != seller_profile.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Validate status transition
    valid_transitions = {
        'pending': ['confirmed', 'cancelled'],
        'confirmed': ['processing', 'cancelled'],
        'processing': ['shipped'],
        'shipped': ['delivered'],
        'delivered': [],
        'cancelled': []
    }
    
    if status not in valid_transitions.get(order_item.status, []):
        raise HTTPException(
            status_code=400, 
            detail=f"Cannot transition from {order_item.status} to {status}"
        )
    
    # Update order item status
    order_item.status = status
    
    # Update main order if provided
    order = order_item.order
    
    # If shipping, tracking number is required
    if status == "shipped":
        if not tracking_number:
            raise HTTPException(
                status_code=400, 
                detail="Tracking number is required for shipped status"
            )
        order.tracking_number = tracking_number
    
    # Check if all items have same status, update main order
    all_items_status = [item.status for item in order.items]
    if len(set(all_items_status)) == 1:
        # All items have same status
        order.status = status
    elif status == "cancelled":
        # At least one item cancelled
        if all(s == "cancelled" for s in all_items_status):
            order.status = "cancelled"
    
    db.commit()
    db.refresh(order_item)
    
    # TODO: Send notification to buyer
    # TODO: Log status change
    
    return {
        "message": f"Order item status updated to {status}",
        "order_item": order_item
    }
```

---

## 4. Pydantic Schemas

### File: `backend/app/schemas/order.py`

```python
from pydantic import BaseModel
from typing import List, Optional
from uuid import UUID
from datetime import datetime


class OrderItemCreate(BaseModel):
    product_id: UUID
    quantity: int
    price: float


class OrderCreate(BaseModel):
    items: List[OrderItemCreate]
    shipping_address: dict
    billing_address: dict
    payment_method: str
    subtotal: float
    shipping_cost: float
    tax: float
    total: float


class OrderItemResponse(BaseModel):
    id: UUID
    order_id: UUID
    product_id: UUID
    seller_id: UUID
    product_name: str
    quantity: int
    price: float
    subtotal: float
    platform_fee: float
    seller_earning: float
    status: str
    created_at: datetime
    
    class Config:
        from_attributes = True


class OrderResponse(BaseModel):
    id: UUID
    order_number: str
    buyer_id: UUID
    status: str
    subtotal: float
    shipping_cost: float
    tax: float
    total: float
    payment_method: str
    payment_status: str
    shipping_address: dict
    billing_address: dict
    tracking_number: Optional[str]
    notes: Optional[str]
    cancelled_at: Optional[datetime]
    cancelled_reason: Optional[str]
    created_at: datetime
    updated_at: datetime
    items: List[OrderItemResponse] = []
    
    class Config:
        from_attributes = True
```

---

## 5. Authentication Helpers

### File: `backend/app/utils/auth.py`

```python
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.config import settings

security = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """Get current authenticated user"""
    token = credentials.credentials
    
    try:
        payload = jwt.decode(
            token, 
            settings.SECRET_KEY, 
            algorithms=[settings.ALGORITHM]
        )
        user_id: str = payload.get("sub")
        
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials"
            )
            
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials"
        )
    
    user = db.query(User).filter(User.id == user_id).first()
    
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    
    return user


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """Require admin role"""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user


def require_seller(current_user: User = Depends(get_current_user)) -> User:
    """Require seller role and approved status"""
    if current_user.role != "seller":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Seller access required"
        )
    
    if not current_user.seller_profile:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Seller profile not found"
        )
    
    if current_user.seller_profile.approval_status != "approved":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Seller account not approved"
        )
    
    return current_user
```

---

## 6. Register Routes in Main App

### File: `backend/app/main.py`

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import auth, products, orders, sellers, admin

app = FastAPI(title="ShopNest API")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(products.router)
app.include_router(orders.router)
app.include_router(sellers.router)
app.include_router(admin.router)


@app.get("/")
def read_root():
    return {"message": "ShopNest API"}
```

---

## Testing Checklist

### Test with Postman/curl:

1. **Admin Seller Management:**
```bash
# Get all sellers
GET /admin/sellers/all
Authorization: Bearer {admin_token}

# Approve seller
POST /admin/sellers/{seller_id}/approval
Authorization: Bearer {admin_token}
Body: {
  "action": "approve"
}

# Reject seller
POST /admin/sellers/{seller_id}/approval
Authorization: Bearer {admin_token}
Body: {
  "action": "reject",
  "rejection_reason": "Incomplete documentation"
}
```

2. **Order Creation:**
```bash
POST /orders
Authorization: Bearer {user_token}
Body: {
  "items": [
    {"product_id": "uuid", "quantity": 2, "price": 29.99}
  ],
  "shipping_address": {...},
  "billing_address": {...},
  "payment_method": "card",
  "subtotal": 59.98,
  "shipping_cost": 15.00,
  "tax": 9.37,
  "total": 84.35
}
```

3. **Seller Order Management:**
```bash
# Get seller orders
GET /sellers/orders
Authorization: Bearer {seller_token}

# Update status
PUT /sellers/orders/{order_item_id}/status
Authorization: Bearer {seller_token}
Body: {
  "status": "shipped",
  "tracking_number": "TRACK123456"
}
```

---

## Next Steps

1. Copy the code templates above
2. Adjust to your existing models and schemas
3. Test each endpoint
4. Add email notifications
5. Add payment processing
6. Deploy and celebrate! 🎉
