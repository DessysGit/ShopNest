from pydantic import BaseModel, Field, field_validator
from typing import List, Optional, Dict, Any
from datetime import datetime
from decimal import Decimal
from uuid import UUID


# ============= Base Schemas =============

class AddressSchema(BaseModel):
    """Address schema for shipping and billing"""
    full_name: str
    phone: str
    address_line1: str
    address_line2: Optional[str] = None
    city: str
    state: str
    postal_code: str
    country: str = "Ghana"


class OrderItemCreate(BaseModel):
    """Schema for creating order items"""
    product_id: UUID
    quantity: int = Field(gt=0, description="Quantity must be positive")


class OrderCreate(BaseModel):
    """Schema for creating an order"""
    items: List[OrderItemCreate] = Field(min_length=1)
    payment_method: str = Field(description="Payment method: stripe, cod, etc.")
    shipping_address: AddressSchema
    billing_address: Optional[AddressSchema] = None
    notes: Optional[str] = None
    
    # These will be calculated on the backend but accepted from frontend
    subtotal: Decimal
    shipping_cost: Decimal = Decimal("0.00")
    tax: Decimal = Decimal("0.00")
    total: Decimal
    
    @field_validator('billing_address', mode='before')
    def set_billing_address(cls, v, info):
        """If billing address not provided, use shipping address"""
        if v is None and 'shipping_address' in info.data:
            return info.data['shipping_address']
        return v


# ============= Response Schemas =============

class OrderItemResponse(BaseModel):
    """Schema for order item in responses"""
    id: UUID
    product_id: UUID
    product_name: str
    quantity: int
    price: Decimal
    subtotal: Decimal
    status: str
    
    class Config:
        from_attributes = True


class OrderItemDetailResponse(OrderItemResponse):
    """Detailed order item response with fees"""
    platform_fee: Decimal
    seller_earning: Decimal


class OrderResponse(BaseModel):
    """Schema for order in list responses"""
    id: UUID
    order_number: str
    status: str
    payment_status: str
    subtotal: Decimal
    shipping_cost: Decimal
    tax: Decimal
    total: Decimal
    payment_method: Optional[str]
    tracking_number: Optional[str]
    cancelled_at: Optional[datetime]
    cancelled_reason: Optional[str]
    created_at: datetime
    items: List[OrderItemResponse]
    
    class Config:
        from_attributes = True


class OrderDetailResponse(BaseModel):
    """Detailed order response"""
    id: UUID
    order_number: str
    status: str
    payment_status: str
    
    # Pricing
    subtotal: Decimal
    platform_fee: Decimal
    shipping_cost: Decimal
    tax: Decimal
    total: Decimal
    
    # Payment & Shipping
    payment_method: Optional[str]
    stripe_payment_intent_id: Optional[str]
    shipping_address: Dict[str, Any]
    billing_address: Dict[str, Any]
    tracking_number: Optional[str]
    
    # Cancellation
    cancelled_at: Optional[datetime]
    cancelled_reason: Optional[str]
    notes: Optional[str]
    
    # Timestamps
    created_at: datetime
    updated_at: Optional[datetime]
    
    # Items
    items: List[OrderItemDetailResponse]
    
    class Config:
        from_attributes = True


# ============= Update Schemas =============

class OrderCancelRequest(BaseModel):
    """Schema for cancelling an order"""
    reason: str = Field(min_length=10, max_length=500)


class OrderStatusUpdate(BaseModel):
    """Schema for updating order status (seller/admin)"""
    status: str = Field(
        description="New status: confirmed, processing, shipped, delivered"
    )
    tracking_number: Optional[str] = None
    
    @field_validator('status')
    def validate_status(cls, v):
        valid_statuses = ['confirmed', 'processing', 'shipped', 'delivered', 'cancelled']
        if v not in valid_statuses:
            raise ValueError(f'Status must be one of: {", ".join(valid_statuses)}')
        return v


# ============= Seller Order Schemas =============

class SellerOrderItemResponse(BaseModel):
    """Order item from seller perspective"""
    id: UUID
    order_id: UUID
    order_number: str
    product_id: UUID
    product_name: str
    quantity: int
    price: Decimal
    subtotal: Decimal
    platform_fee: Decimal
    seller_earning: Decimal
    status: str
    created_at: datetime
    
    # Buyer info (limited)
    buyer_name: Optional[str] = None
    shipping_address: Optional[Dict[str, Any]] = None


class SellerOrdersStats(BaseModel):
    """Statistics for seller orders"""
    total_orders: int
    pending_orders: int
    processing_orders: int
    completed_orders: int
    cancelled_orders: int
    total_revenue: Decimal
    total_platform_fees: Decimal
    total_earnings: Decimal
