from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime
from uuid import UUID
from decimal import Decimal


class SellerProfileCreate(BaseModel):
    business_name: str = Field(..., min_length=2, max_length=200)
    business_description: Optional[str] = None
    business_address: Optional[str] = None
    tax_id: Optional[str] = None


class SellerProfileUpdate(BaseModel):
    business_name: Optional[str] = Field(None, min_length=2, max_length=200)
    business_description: Optional[str] = None
    business_logo: Optional[str] = None
    business_address: Optional[str] = None
    tax_id: Optional[str] = None


class SellerProfileResponse(BaseModel):
    id: UUID
    user_id: UUID
    business_name: str
    business_description: Optional[str] = None
    business_logo: Optional[str] = None
    business_address: Optional[str] = None
    approval_status: str
    commission_rate: Decimal
    total_sales: Decimal
    rating_average: Decimal
    total_reviews: int
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class SellerApprovalAction(BaseModel):
    action: str = Field(..., pattern="^(approve|reject)$")
    rejection_reason: Optional[str] = None
