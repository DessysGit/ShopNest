"""
Wishlist Pydantic Schemas
=========================

This module defines Pydantic schemas for wishlist-related API request and response
validation. These schemas ensure data integrity and provide automatic API
documentation via FastAPI's OpenAPI integration.

Schema Hierarchy:
    - WishlistItemBase: Base schema with common fields
    - WishlistItemCreate: Used for creating wishlist items (request body)
    - WishlistItemResponse: Used for returning wishlist item details
    - WishlistItemWithProduct: Extended response including full product details

All schemas use ConfigDict(from_attributes=True) to enable ORM mode, allowing
direct instantiation from SQLAlchemy model instances.
"""

from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime
from uuid import UUID


class WishlistItemBase(BaseModel):
    """
    Base Wishlist Schema
    --------------------
    Contains the common field shared across all wishlist-related schemas.
    
    Attributes:
        product_id: UUID of the product being added to the wishlist
    """
    product_id: UUID


class WishlistItemCreate(WishlistItemBase):
    """
    Wishlist Item Creation Schema
    -----------------------------
    Used as the request body for POST /wishlist/{product_id} endpoint.
    Currently inherits all fields from WishlistItemBase, but can be extended
    for additional validation or nested object creation.
    
    Example Request Body:
        {
            "product_id": "123e4567-e89b-12d3-a456-426614174000"
        }
    """
    pass


class WishlistItemResponse(WishlistItemBase):
    """
    Wishlist Item Response Schema
    -----------------------------
    Used for returning basic wishlist item information from API endpoints.
    
    Attributes:
        id: Unique UUID identifier for this wishlist item
        user_id: UUID of the user who owns this wishlist item
        created_at: ISO timestamp of when the item was added to wishlist
        
    ORM Mode:
        from_attributes=True allows this schema to be instantiated directly
        from SQLAlchemy model objects (e.g., WishlistItemResponse.model_validate(db_item))
    """
    id: UUID
    user_id: UUID
    created_at: datetime
    
    # Enable instantiation from SQLAlchemy ORM objects
    model_config = ConfigDict(from_attributes=True)


class WishlistItemWithProduct(WishlistItemResponse):
    """
    Wishlist Item with Product Details Schema
    ---------------------------------------
    Extended response schema that includes full product information.
    Used for GET /wishlist endpoint to return enriched wishlist data.
    
    Attributes:
        product: Optional dictionary containing:
            - id: Product UUID
            - name: Product name
            - price: Product price as float
            - quantity: Available stock
            - images: List of image URLs
            - primary_image: First image URL (convenience field)
            - rating_average: Average star rating (1-5)
            - total_reviews: Number of reviews for this product
            - is_active: Whether product is available for purchase
    
    This schema enables the frontend to display wishlist items with full
    product information without requiring additional API calls.
    """
    product: Optional[dict] = None  # Contains full product details for display