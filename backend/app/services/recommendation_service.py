"""
Recommendation Service for ShopNest
Provides product recommendations based on various algorithms
"""

from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, and_, desc
from app.models.product import Product, ProductImage
from app.models.order import Order, OrderItem
from typing import List, Optional
import random


class RecommendationService:
    """Service for generating product recommendations"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def get_similar_products(
        self, 
        product_id: str, 
        limit: int = 8
    ) -> List[Product]:
        """
        Get products similar to the given product
        Based on same category and similar price range
        """
        # Get the original product
        product = self.db.query(Product).filter(Product.id == product_id).first()
        
        if not product:
            return []
        
        # Define price range (±30%)
        price_min = float(product.price) * 0.7
        price_max = float(product.price) * 1.3
        
        # Find similar products
        similar = self.db.query(Product)\
            .options(joinedload(Product.images))\
            .filter(
                and_(
                    Product.id != product_id,
                    Product.category_id == product.category_id,
                    Product.is_active == True,
                    Product.quantity > 0,
                    Product.price >= price_min,
                    Product.price <= price_max
                )
            )\
            .order_by(
                desc(Product.rating_average),
                desc(Product.sales_count)
            )\
            .limit(limit)\
            .all()
        
        return similar
    
    def get_popular_products(self, limit: int = 12) -> List[Product]:
        """
        Get popular products based on sales and ratings
        """
        popular = self.db.query(Product)\
            .options(joinedload(Product.images))\
            .filter(
                and_(
                    Product.is_active == True,
                    Product.quantity > 0
                )
            )\
            .order_by(
                desc(Product.sales_count),
                desc(Product.rating_average),
                desc(Product.views_count)
            )\
            .limit(limit)\
            .all()
        
        return popular
    
    def get_trending_products(self, limit: int = 12) -> List[Product]:
        """
        Get trending products (recent activity)
        For now, same as popular but can be enhanced with time-based scoring
        """
        # In future, calculate based on recent views/sales
        # For now, use is_featured flag and recent products
        trending = self.db.query(Product)\
            .options(joinedload(Product.images))\
            .filter(
                and_(
                    Product.is_active == True,
                    Product.quantity > 0
                )
            )\
            .order_by(
                desc(Product.is_featured),
                desc(Product.created_at)
            )\
            .limit(limit)\
            .all()
        
        return trending
    
    def get_seller_other_products(
        self, 
        product_id: str,
        seller_id: str,
        limit: int = 8
    ) -> List[Product]:
        """
        Get other products from the same seller
        """
        other_products = self.db.query(Product)\
            .options(joinedload(Product.images))\
            .filter(
                and_(
                    Product.id != product_id,
                    Product.seller_id == seller_id,
                    Product.is_active == True,
                    Product.quantity > 0
                )
            )\
            .order_by(
                desc(Product.rating_average),
                desc(Product.sales_count)
            )\
            .limit(limit)\
            .all()
        
        return other_products
    
    def get_frequently_bought_together(
        self, 
        product_id: str,
        limit: int = 4
    ) -> List[dict]:
        """
        Get products frequently bought together with this product
        Returns products that appear in the same orders
        """
        # Get orders containing this product
        orders_with_product = self.db.query(OrderItem.order_id)\
            .filter(OrderItem.product_id == product_id)\
            .distinct()\
            .all()
        
        order_ids = [order.order_id for order in orders_with_product]
        
        if not order_ids:
            return []
        
        # Count product co-occurrences
        co_occurrences = self.db.query(
            OrderItem.product_id,
            func.count(OrderItem.product_id).label('count')
        )\
        .filter(
            and_(
                OrderItem.order_id.in_(order_ids),
                OrderItem.product_id != product_id
            )
        )\
        .group_by(OrderItem.product_id)\
        .order_by(desc('count'))\
        .limit(limit)\
        .all()
        
        # Get product details
        product_ids = [item.product_id for item in co_occurrences]
        
        if not product_ids:
            return []
        
        products = self.db.query(Product)\
            .options(joinedload(Product.images))\
            .filter(
                and_(
                    Product.id.in_(product_ids),
                    Product.is_active == True,
                    Product.quantity > 0
                )
            )\
            .all()
        
        # Attach purchase count to products
        result = []
        for product in products:
            count = next(
                (item.count for item in co_occurrences if item.product_id == product.id), 
                0
            )
            result.append({
                'product': product,
                'times_bought_together': count
            })
        
        return result
    
    def get_category_popular(
        self, 
        category_id: str,
        exclude_id: Optional[str] = None,
        limit: int = 8
    ) -> List[Product]:
        """
        Get popular products in a specific category
        """
        query = self.db.query(Product)\
            .options(joinedload(Product.images))\
            .filter(
                and_(
                    Product.category_id == category_id,
                    Product.is_active == True,
                    Product.quantity > 0
                )
            )
        
        if exclude_id:
            query = query.filter(Product.id != exclude_id)
        
        popular = query\
            .order_by(
                desc(Product.sales_count),
                desc(Product.rating_average)
            )\
            .limit(limit)\
            .all()
        
        return popular
    
    def get_random_recommendations(self, limit: int = 12) -> List[Product]:
        """
        Get random active products (fallback when no other data available)
        """
        # Get count of active products
        count = self.db.query(Product)\
            .filter(
                and_(
                    Product.is_active == True,
                    Product.quantity > 0
                )
            )\
            .count()
        
        if count == 0:
            return []
        
        # Get random offset
        if count > limit:
            offset = random.randint(0, count - limit)
        else:
            offset = 0
        
        products = self.db.query(Product)\
            .options(joinedload(Product.images))\
            .filter(
                and_(
                    Product.is_active == True,
                    Product.quantity > 0
                )
            )\
            .offset(offset)\
            .limit(limit)\
            .all()
        
        return products
