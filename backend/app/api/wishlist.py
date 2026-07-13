"""
Wishlist API Endpoints
======================

This module provides RESTful API endpoints for managing user wishlists in the ShopNest
e-commerce platform. Users can save products to their wishlist for future reference and
quick access.

Endpoints:
    - GET /wishlist: Retrieve all wishlist items for the authenticated user
    - POST /wishlist/{product_id}: Add a product to the user's wishlist  
    - DELETE /wishlist/{product_id}: Remove a product from the user's wishlist
    - GET /wishlist/check/{product_id}: Check if a product exists in the user's wishlist

Authentication:
    All endpoints require valid JWT authentication via the get_current_user dependency.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from app.database import get_db
from app.models.user import User
from app.models.wishlist import WishlistItem
from app.models.product import Product, ProductImage
from app.middleware.auth_middleware import get_current_user
from app.schemas.wishlist import WishlistItemCreate, WishlistItemResponse, WishlistItemWithProduct


# Create API router with wishlist tag for documentation grouping
router = APIRouter(prefix="/wishlist", tags=["Wishlist"])


@router.get("", response_model=List[WishlistItemWithProduct])
async def get_wishlist(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieve all wishlist items for the authenticated user.
    
    This endpoint returns a list of products saved to the user's wishlist,
    with full product details included (images, price, stock, ratings).
    
    Args:
        db: Database session dependency
        current_user: Authenticated user from JWT token
        
    Returns:
        List of WishlistItemWithProduct objects containing:
        - id: Wishlist item UUID
        - user_id: User who saved the item
        - product_id: Product saved to wishlist
        - created_at: When item was added
        - product: Full product object with details
        
    Raises:
        No exceptions - returns empty list if no wishlist items exist
    """
    # Query all wishlist items belonging to the current user
    wishlist_items = db.query(WishlistItem).filter(
        WishlistItem.user_id == current_user.id
    ).all()
    
    result = []
    # Enrich each wishlist item with full product details
    for item in wishlist_items:
        product = db.query(Product).filter(Product.id == item.product_id).first()
        if product:
            # Query images separately to avoid lazy loading issues
            images = db.query(ProductImage).filter(
                ProductImage.product_id == product.id
            ).order_by(ProductImage.position).all()
            
            # Build product data with explicit image handling
            product_data = {
                "id": str(product.id),
                "name": product.name,
                "price": float(product.price),
                "quantity": product.quantity,
                "images": [img.image_url for img in images] if images else [],
                "primary_image": images[0].image_url if images else None,
                "rating_average": float(product.rating_average) if product.rating_average else 0.0,
                "total_reviews": product.total_reviews if product.total_reviews else 0,
                "is_active": product.is_active
            }
            
            # Build the response directly
            result.append(WishlistItemWithProduct(
                id=item.id,
                user_id=item.user_id,
                product_id=item.product_id,
                created_at=item.created_at,
                product=product_data
            ))
    
    return result


@router.post("/{product_id}", response_model=WishlistItemResponse, status_code=status.HTTP_201_CREATED)
async def add_to_wishlist(
    product_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Add a product to the user's wishlist.
    
    This endpoint saves a product reference for later purchase. If the product
    is already in the wishlist, it returns an error.
    
    Args:
        product_id: UUID of the product to add to wishlist
        db: Database session dependency
        current_user: Authenticated user from JWT token
        
    Returns:
        WishlistItemResponse with the created wishlist item details
        
    Raises:
        404 Not Found: If the product doesn't exist
        400 Bad Request: If product is already in the user's wishlist
    """
    # Check if product exists in database
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    # Check if product is already in user's wishlist (prevent duplicates)
    existing = db.query(WishlistItem).filter(
        WishlistItem.user_id == current_user.id,
        WishlistItem.product_id == product_id
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Product already in wishlist"
        )
    
    # Create and save new wishlist item
    wishlist_item = WishlistItem(
        user_id=current_user.id,
        product_id=product_id
    )
    
    db.add(wishlist_item)
    db.commit()
    db.refresh(wishlist_item)
    
    return WishlistItemResponse.model_validate(wishlist_item)


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_from_wishlist(
    product_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Remove a product from the user's wishlist.
    
    This endpoint deletes a wishlist item, removing the product from the user's
    saved items. No action is taken if the product wasn't in the wishlist.
    
    Args:
        product_id: UUID of the product to remove from wishlist
        db: Database session dependency
        current_user: Authenticated user from JWT token
        
    Returns:
        None (204 No Content status)
        
    Raises:
        404 Not Found: If the product is not in the user's wishlist
    """
    # Find the wishlist item to delete
    wishlist_item = db.query(WishlistItem).filter(
        WishlistItem.user_id == current_user.id,
        WishlistItem.product_id == product_id
    ).first()
    
    if not wishlist_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not in wishlist"
        )
    
    # Delete the wishlist item
    db.delete(wishlist_item)
    db.commit()
    
    return None


@router.get("/check/{product_id}")
async def check_wishlist(
    product_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Check if a product is in the user's wishlist.
    
    This endpoint is used to determine if the wishlist heart icon should be
    filled on product cards, enabling visual feedback for saved items.
    
    Args:
        product_id: UUID of the product to check
        db: Database session dependency
        current_user: Authenticated user from JWT token
        
    Returns:
        JSON object with in_wishlist boolean:
        - true: Product is in user's wishlist
        - false: Product is not in user's wishlist
    """
    item = db.query(WishlistItem).filter(
        WishlistItem.user_id == current_user.id,
        WishlistItem.product_id == product_id
    ).first()
    
    return {"in_wishlist": item is not None}