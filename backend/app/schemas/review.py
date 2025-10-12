from pydantic import BaseModel, Field, field_validator
from typing import Optional
from datetime import datetime
from uuid import UUID


class ReviewCreate(BaseModel):
    """Schema for creating a review"""
    product_id: UUID
    order_id: Optional[UUID] = None
    rating: int = Field(ge=1, le=5, description="Rating from 1 to 5")
    comment: str = Field(min_length=10, max_length=1000)
    
    @field_validator('comment')
    def validate_comment(cls, v):
        if len(v.strip()) < 10:
            raise ValueError('Comment must be at least 10 characters long')
        return v.strip()


class ReviewUpdate(BaseModel):
    """Schema for updating a review"""
    rating: Optional[int] = Field(None, ge=1, le=5)
    comment: Optional[str] = Field(None, min_length=10, max_length=1000)
    
    @field_validator('comment')
    def validate_comment(cls, v):
        if v and len(v.strip()) < 10:
            raise ValueError('Comment must be at least 10 characters long')
        return v.strip() if v else v


class ReviewResponse(BaseModel):
    """Schema for review in responses"""
    id: UUID
    product_id: UUID
    user_id: UUID
    order_id: Optional[UUID]
    rating: int
    comment: str
    helpful_count: int
    created_at: datetime
    updated_at: Optional[datetime]
    
    # User info
    user_name: Optional[str] = None
    user_email: Optional[str] = None
    
    class Config:
        from_attributes = True


class ReviewStats(BaseModel):
    """Schema for review statistics"""
    total_reviews: int
    average_rating: float
    rating_distribution: dict  # {1: count, 2: count, ...}
