from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from app.database import get_db
from app.models.user import User
from app.models.wishlist import WishlistItem
from app.models.product import Product
from app.middleware.auth_middleware import get_current_user
from app.schemas.wishlist import WishlistItemCreate, WishlistItemResponse, WishlistItemWithProduct

router = APIRouter(prefix="/wishlist", tags=["Wishlist"])


@router.get("", response_model=List[WishlistItemWithProduct])
async def get_wishlist(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all wishlist items for the current user
    Returns wishlist items with product details
    """
    wishlist_items = db.query(WishlistItem).filter(
        WishlistItem.user_id == current_user.id
    ).all()
    
    result = []
    for item in wishlist_items:
        product = db.query(Product).filter(Product.id == item.product_id).first()
        if product:
            item_dict = WishlistItemWithProduct.model_validate(item).model_dump()
            item_dict["product"] = {
                "id": product.id,
                "name": product.name,
                "price": float(product.price),
                "quantity": product.quantity,
                "images": [img.image_url for img in product.images] if product.images else [],
                "primary_image": product.images[0].image_url if product.images else None,
                "rating_average": float(product.rating_average) if product.rating_average else 0,
                "total_reviews": product.total_reviews,
                "is_active": product.is_active
            }
            result.append(WishlistItemWithProduct(**item_dict))
    
    return result


@router.post("/{product_id}", response_model=WishlistItemResponse, status_code=status.HTTP_201_CREATED)
async def add_to_wishlist(
    product_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Add a product to the user's wishlist
    """
    # Check if product exists
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    # Check if already in wishlist
    existing = db.query(WishlistItem).filter(
        WishlistItem.user_id == current_user.id,
        WishlistItem.product_id == product_id
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Product already in wishlist"
        )
    
    # Add to wishlist
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
    Remove a product from the user's wishlist
    """
    wishlist_item = db.query(WishlistItem).filter(
        WishlistItem.user_id == current_user.id,
        WishlistItem.product_id == product_id
    ).first()
    
    if not wishlist_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not in wishlist"
        )
    
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
    Check if a product is in the user's wishlist
    """
    item = db.query(WishlistItem).filter(
        WishlistItem.user_id == current_user.id,
        WishlistItem.product_id == product_id
    ).first()
    
    return {"in_wishlist": item is not None}