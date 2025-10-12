from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from uuid import UUID

from app.database import get_db
from app.models.user import User
from app.models.review import Review
from app.models.product import Product
from app.models.order import Order, OrderItem
from app.middleware.auth_middleware import get_current_user
from app.schemas.review import ReviewCreate, ReviewUpdate, ReviewResponse, ReviewStats

router = APIRouter(prefix="/reviews", tags=["Reviews"])


@router.post("", response_model=ReviewResponse, status_code=status.HTTP_201_CREATED)
async def create_review(
    review_data: ReviewCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new review for a product
    
    - User must have purchased the product to review it
    - One review per user per product
    """
    
    # Check if product exists
    product = db.query(Product).filter(Product.id == review_data.product_id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    # Check if user already reviewed this product
    existing_review = db.query(Review).filter(
        Review.product_id == review_data.product_id,
        Review.user_id == current_user.id
    ).first()
    
    if existing_review:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You have already reviewed this product. You can update your existing review instead."
        )
    
    # Optional: Verify user purchased the product
    if review_data.order_id:
        order = db.query(Order).filter(
            Order.id == review_data.order_id,
            Order.buyer_id == current_user.id
        ).first()
        
        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Order not found"
            )
        
        # Check if order contains the product
        order_item = db.query(OrderItem).filter(
            OrderItem.order_id == review_data.order_id,
            OrderItem.product_id == review_data.product_id
        ).first()
        
        if not order_item:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This product is not in the specified order"
            )
    
    # Create review
    review = Review(
        product_id=review_data.product_id,
        user_id=current_user.id,
        order_id=review_data.order_id,
        rating=review_data.rating,
        comment=review_data.comment
    )
    
    db.add(review)
    db.commit()
    db.refresh(review)
    
    # Update product rating
    update_product_rating(db, review_data.product_id)
    
    # Add user info to response
    response = ReviewResponse.model_validate(review)
    response.user_name = f"{current_user.first_name or ''} {current_user.last_name or ''}".strip() or "Anonymous"
    response.user_email = current_user.email
    
    return response


@router.get("/product/{product_id}", response_model=List[ReviewResponse])
async def get_product_reviews(
    product_id: UUID,
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db)
):
    """
    Get all reviews for a product
    
    - Paginated results
    - Sorted by newest first
    """
    
    reviews = db.query(Review).filter(
        Review.product_id == product_id
    ).order_by(Review.created_at.desc()).offset(skip).limit(limit).all()
    
    # Add user info to each review
    result = []
    for review in reviews:
        review_response = ReviewResponse.model_validate(review)
        review_response.user_name = f"{review.user.first_name or ''} {review.user.last_name or ''}".strip() or "Anonymous"
        review_response.user_email = review.user.email
        result.append(review_response)
    
    return result


@router.get("/product/{product_id}/stats", response_model=ReviewStats)
async def get_product_review_stats(
    product_id: UUID,
    db: Session = Depends(get_db)
):
    """
    Get review statistics for a product
    
    - Total reviews
    - Average rating
    - Rating distribution
    """
    
    reviews = db.query(Review).filter(Review.product_id == product_id).all()
    
    if not reviews:
        return ReviewStats(
            total_reviews=0,
            average_rating=0.0,
            rating_distribution={1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
        )
    
    total_reviews = len(reviews)
    average_rating = sum(r.rating for r in reviews) / total_reviews
    
    # Calculate rating distribution
    rating_distribution = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
    for review in reviews:
        rating_distribution[review.rating] += 1
    
    return ReviewStats(
        total_reviews=total_reviews,
        average_rating=round(average_rating, 2),
        rating_distribution=rating_distribution
    )


@router.get("/my-reviews", response_model=List[ReviewResponse])
async def get_my_reviews(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all reviews by the current user"""
    
    reviews = db.query(Review).filter(
        Review.user_id == current_user.id
    ).order_by(Review.created_at.desc()).all()
    
    result = []
    for review in reviews:
        review_response = ReviewResponse.model_validate(review)
        review_response.user_name = f"{current_user.first_name or ''} {current_user.last_name or ''}".strip() or "Anonymous"
        review_response.user_email = current_user.email
        result.append(review_response)
    
    return result


@router.put("/{review_id}", response_model=ReviewResponse)
async def update_review(
    review_id: UUID,
    review_data: ReviewUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update an existing review
    
    - Only the review author can update
    """
    
    review = db.query(Review).filter(Review.id == review_id).first()
    
    if not review:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Review not found"
        )
    
    if review.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only update your own reviews"
        )
    
    # Update fields
    update_data = review_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(review, field, value)
    
    db.commit()
    db.refresh(review)
    
    # Update product rating if rating changed
    if review_data.rating:
        update_product_rating(db, review.product_id)
    
    # Add user info to response
    response = ReviewResponse.model_validate(review)
    response.user_name = f"{current_user.first_name or ''} {current_user.last_name or ''}".strip() or "Anonymous"
    response.user_email = current_user.email
    
    return response


@router.delete("/{review_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_review(
    review_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delete a review
    
    - Only the review author can delete
    """
    
    review = db.query(Review).filter(Review.id == review_id).first()
    
    if not review:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Review not found"
        )
    
    if review.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete your own reviews"
        )
    
    product_id = review.product_id
    
    db.delete(review)
    db.commit()
    
    # Update product rating
    update_product_rating(db, product_id)
    
    return None


@router.post("/{review_id}/helpful")
async def mark_review_helpful(
    review_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Mark a review as helpful"""
    
    review = db.query(Review).filter(Review.id == review_id).first()
    
    if not review:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Review not found"
        )
    
    # Increment helpful count
    review.helpful_count += 1
    db.commit()
    
    return {"message": "Review marked as helpful", "helpful_count": review.helpful_count}


# Helper function to update product rating
def update_product_rating(db: Session, product_id: UUID):
    """Update product's average rating and review count"""
    
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        return
    
    # Calculate average rating
    result = db.query(
        func.avg(Review.rating).label('avg_rating'),
        func.count(Review.id).label('review_count')
    ).filter(Review.product_id == product_id).first()
    
    if result.review_count > 0:
        product.rating_average = round(float(result.avg_rating), 2)
        product.total_reviews = result.review_count
    else:
        product.rating_average = 0
        product.total_reviews = 0
    
    db.commit()
