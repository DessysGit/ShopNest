"""
Recommendation API Endpoints
Provides various product recommendation endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.recommendation_service import RecommendationService
from app.schemas.product import ProductResponse
from typing import List

router = APIRouter(prefix="/recommendations", tags=["recommendations"])


@router.get("/similar/{product_id}", response_model=List[ProductResponse])
async def get_similar_products(
    product_id: str,
    limit: int = Query(default=8, ge=1, le=20),
    db: Session = Depends(get_db)
):
    """
    Get products similar to the specified product
    Based on same category and similar price range
    """
    service = RecommendationService(db)
    products = service.get_similar_products(product_id, limit)
    return products


@router.get("/popular", response_model=List[ProductResponse])
async def get_popular_products(
    limit: int = Query(default=12, ge=1, le=50),
    db: Session = Depends(get_db)
):
    """
    Get popular products based on sales and ratings
    """
    service = RecommendationService(db)
    products = service.get_popular_products(limit)
    return products


@router.get("/trending", response_model=List[ProductResponse])
async def get_trending_products(
    limit: int = Query(default=12, ge=1, le=50),
    db: Session = Depends(get_db)
):
    """
    Get trending products
    """
    service = RecommendationService(db)
    products = service.get_trending_products(limit)
    return products


@router.get("/seller/{seller_id}/other/{product_id}", response_model=List[ProductResponse])
async def get_seller_other_products(
    seller_id: str,
    product_id: str,
    limit: int = Query(default=8, ge=1, le=20),
    db: Session = Depends(get_db)
):
    """
    Get other products from the same seller
    """
    service = RecommendationService(db)
    products = service.get_seller_other_products(product_id, seller_id, limit)
    return products


@router.get("/bought-together/{product_id}")
async def get_frequently_bought_together(
    product_id: str,
    limit: int = Query(default=4, ge=1, le=10),
    db: Session = Depends(get_db)
):
    """
    Get products frequently bought together with this product
    """
    service = RecommendationService(db)
    result = service.get_frequently_bought_together(product_id, limit)
    
    # Format response
    return {
        "product_id": product_id,
        "recommendations": [
            {
                "product": item['product'],
                "times_bought_together": item['times_bought_together']
            }
            for item in result
        ]
    }


@router.get("/category/{category_id}", response_model=List[ProductResponse])
async def get_category_recommendations(
    category_id: str,
    exclude_id: str = Query(default=None),
    limit: int = Query(default=8, ge=1, le=20),
    db: Session = Depends(get_db)
):
    """
    Get popular products in a specific category
    """
    service = RecommendationService(db)
    products = service.get_category_popular(category_id, exclude_id, limit)
    return products
