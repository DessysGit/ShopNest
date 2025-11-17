from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from app.database import get_db
from app.schemas.product import (
    ProductCreate,
    ProductUpdate,
    ProductResponse,
    ProductListResponse,
    ProductImageResponse
)
from app.models.product import Product, ProductImage
from app.models.seller import SellerProfile, ApprovalStatus
from app.models.category import Category
from app.models.user import User
from app.middleware.auth_middleware import get_current_seller, get_optional_user
from app.utils.helpers import generate_slug
from typing import List, Optional
from uuid import UUID

router = APIRouter(prefix="/products", tags=["Products"])


@router.get("", response_model=List[ProductListResponse])
async def get_products(
    search: Optional[str] = None,
    category_id: Optional[str] = None,
    seller_id: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    in_stock: Optional[bool] = None,
    is_featured: Optional[bool] = None,
    sort_by: str = Query(default="created_at", regex="^(created_at|price|rating|sales|name)$"),
    sort_order: str = Query(default="desc", regex="^(asc|desc)$"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """Get all products with filters and search (public endpoint)"""
    
    query = db.query(Product).filter(Product.is_active == True)
    
    # Search by name or description
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                Product.name.ilike(search_term),
                Product.description.ilike(search_term)
            )
        )
    
    # Filter by category
    if category_id:
        query = query.filter(Product.category_id == category_id)
    
    # Filter by seller
    if seller_id:
        query = query.filter(Product.seller_id == seller_id)
    
    # Filter by price range
    if min_price is not None:
        query = query.filter(Product.price >= min_price)
    if max_price is not None:
        query = query.filter(Product.price <= max_price)
    
    # Filter by stock
    if in_stock:
        query = query.filter(Product.quantity > 0)
    
    # Filter by featured
    if is_featured is not None:
        query = query.filter(Product.is_featured == is_featured)
    
    # Sorting
    sort_column = getattr(Product, sort_by)
    if sort_order == "desc":
        query = query.order_by(sort_column.desc())
    else:
        query = query.order_by(sort_column.asc())
    
    # Pagination
    offset = (page - 1) * page_size
    products = query.offset(offset).limit(page_size).all()
    
    # Get primary image for each product
    result = []
    for product in products:
        primary_image = db.query(ProductImage).filter(
            ProductImage.product_id == product.id,
            ProductImage.is_primary == True
        ).first()
        
        product_dict = ProductListResponse.model_validate(product).model_dump()
        product_dict['primary_image'] = primary_image.image_url if primary_image else None
        result.append(ProductListResponse(**product_dict))
    
    return result


@router.get("/{product_id}", response_model=ProductResponse)
async def get_product(
    product_id: str,
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    """Get a single product with all details"""
    
    product = db.query(Product).filter(Product.id == product_id).first()
    
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    # Only show inactive products to the seller who owns them
    if not product.is_active:
        if not current_user or (
            current_user.role != "seller" or 
            str(product.seller_id) != str(current_user.id)
        ):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Product not found"
            )
    
    # Increment view count
    product.views_count += 1
    db.commit()
    
    # Get images
    images = db.query(ProductImage).filter(
        ProductImage.product_id == product_id
    ).order_by(ProductImage.position).all()
    
    product_dict = ProductResponse.model_validate(product).model_dump()
    product_dict['images'] = [ProductImageResponse.model_validate(img) for img in images]
    
    return ProductResponse(**product_dict)


@router.post("", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
async def create_product(
    product_data: ProductCreate,
    current_user: User = Depends(get_current_seller),
    db: Session = Depends(get_db)
):
    """Create a new product (approved sellers only)"""
    
    # Get seller profile
    seller_profile = db.query(SellerProfile).filter(
        SellerProfile.user_id == current_user.id
    ).first()
    
    if not seller_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Seller profile not found"
        )
    
    # Check if seller is approved
    if seller_profile.approval_status != ApprovalStatus.APPROVED:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Your seller account is {seller_profile.approval_status.value}. Only approved sellers can list products."
        )
    
    # Verify category exists
    category = db.query(Category).filter(Category.id == product_data.category_id).first()
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )
    
    # Generate slug
    slug = generate_slug(product_data.name)
    
    # Check if slug exists, add number if needed
    existing_slug = db.query(Product).filter(Product.slug == slug).first()
    if existing_slug:
        counter = 1
        while db.query(Product).filter(Product.slug == f"{slug}-{counter}").first():
            counter += 1
        slug = f"{slug}-{counter}"
    
    # Check if SKU is unique (if provided)
    if product_data.sku:
        existing_sku = db.query(Product).filter(Product.sku == product_data.sku).first()
        if existing_sku:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="SKU already exists"
            )
    
    # Create product
    new_product = Product(
        seller_id=seller_profile.id,
        category_id=product_data.category_id,
        name=product_data.name,
        slug=slug,
        description=product_data.description,
        price=product_data.price,
        compare_at_price=product_data.compare_at_price,
        cost_per_item=product_data.cost_per_item,
        sku=product_data.sku,
        barcode=product_data.barcode,
        quantity=product_data.quantity,
        low_stock_threshold=product_data.low_stock_threshold,
        weight=product_data.weight,
        dimensions=product_data.dimensions,
        is_digital=product_data.is_digital,
        digital_file_url=product_data.digital_file_url
    )
    
    db.add(new_product)
    db.commit()
    db.refresh(new_product)
    
    # Add images
    for img_data in product_data.images:
        product_image = ProductImage(
            product_id=new_product.id,
            image_url=img_data.image_url,
            alt_text=img_data.alt_text,
            position=img_data.position,
            is_primary=img_data.is_primary
        )
        db.add(product_image)
    
    db.commit()
    
    # Get images for response
    images = db.query(ProductImage).filter(
        ProductImage.product_id == new_product.id
    ).all()
    
    product_dict = ProductResponse.model_validate(new_product).model_dump()
    product_dict['images'] = [ProductImageResponse.model_validate(img) for img in images]
    
    return ProductResponse(**product_dict)


@router.put("/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: str,
    product_data: ProductUpdate,
    current_user: User = Depends(get_current_seller),
    db: Session = Depends(get_db)
):
    """Update a product (only by the seller who owns it)"""
    
    product = db.query(Product).filter(Product.id == product_id).first()
    
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    # Get seller profile
    seller_profile = db.query(SellerProfile).filter(
        SellerProfile.user_id == current_user.id
    ).first()
    
    # Check if user owns this product
    if str(product.seller_id) != str(seller_profile.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only update your own products"
        )
    
    # Update fields
    update_data = product_data.model_dump(exclude_unset=True)
    
    # If name is being updated, regenerate slug
    if "name" in update_data:
        new_slug = generate_slug(update_data["name"])
        existing = db.query(Product).filter(
            Product.slug == new_slug,
            Product.id != product_id
        ).first()
        if existing:
            counter = 1
            while db.query(Product).filter(Product.slug == f"{new_slug}-{counter}").first():
                counter += 1
            new_slug = f"{new_slug}-{counter}"
        product.slug = new_slug
    
    # If SKU is being updated, check uniqueness
    if "sku" in update_data and update_data["sku"]:
        existing_sku = db.query(Product).filter(
            Product.sku == update_data["sku"],
            Product.id != product_id
        ).first()
        if existing_sku:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="SKU already exists"
            )
    
    # If category is being updated, verify it exists
    if "category_id" in update_data:
        category = db.query(Category).filter(Category.id == update_data["category_id"]).first()
        if not category:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Category not found"
            )
    
    # Handle images separately if provided
    images_data = update_data.pop('images', None)
    
    for field, value in update_data.items():
        if field != "name":
            setattr(product, field, value)
        else:
            product.name = value
    
    db.commit()
    
    # Update images if provided
    if images_data is not None:
        # Delete existing images
        db.query(ProductImage).filter(ProductImage.product_id == product_id).delete()
        
        # Add new images
        for img_data in images_data:
            product_image = ProductImage(
                product_id=product_id,
                image_url=img_data['image_url'],
                alt_text=img_data.get('alt_text'),
                position=img_data.get('position', 0),
                is_primary=img_data.get('is_primary', False)
            )
            db.add(product_image)
        
        db.commit()
    
    db.refresh(product)
    
    # Get images
    images = db.query(ProductImage).filter(
        ProductImage.product_id == product_id
    ).all()
    
    product_dict = ProductResponse.model_validate(product).model_dump()
    product_dict['images'] = [ProductImageResponse.model_validate(img) for img in images]
    
    return ProductResponse(**product_dict)


@router.delete("/{product_id}")
async def delete_product(
    product_id: str,
    current_user: User = Depends(get_current_seller),
    db: Session = Depends(get_db)
):
    """Delete a product (only by the seller who owns it)"""
    
    product = db.query(Product).filter(Product.id == product_id).first()
    
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    # Get seller profile
    seller_profile = db.query(SellerProfile).filter(
        SellerProfile.user_id == current_user.id
    ).first()
    
    # Check if user owns this product
    if str(product.seller_id) != str(seller_profile.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete your own products"
        )
    
    # TODO: Check if product has pending orders
    
    db.delete(product)
    db.commit()
    
    return {"message": "Product deleted successfully"}


@router.get("/seller/my-products", response_model=List[ProductListResponse])
async def get_seller_products(
    include_inactive: bool = False,
    current_user: User = Depends(get_current_seller),
    db: Session = Depends(get_db)
):
    """Get all products for the current seller"""
    
    seller_profile = db.query(SellerProfile).filter(
        SellerProfile.user_id == current_user.id
    ).first()
    
    query = db.query(Product).filter(Product.seller_id == seller_profile.id)
    
    if not include_inactive:
        query = query.filter(Product.is_active == True)
    
    products = query.order_by(Product.created_at.desc()).all()
    
    result = []
    for product in products:
        primary_image = db.query(ProductImage).filter(
            ProductImage.product_id == product.id,
            ProductImage.is_primary == True
        ).first()
        
        product_dict = ProductListResponse.model_validate(product).model_dump()
        product_dict['primary_image'] = primary_image.image_url if primary_image else None
        result.append(ProductListResponse(**product_dict))
    
    return result
