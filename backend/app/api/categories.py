from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.category import CategoryCreate, CategoryUpdate, CategoryResponse
from app.models.category import Category
from app.middleware.auth_middleware import get_current_admin
from app.utils.helpers import generate_slug
from typing import List

router = APIRouter(prefix="/categories", tags=["Categories"])


@router.get("", response_model=List[CategoryResponse])
async def get_all_categories(
    include_inactive: bool = False,
    db: Session = Depends(get_db)
):
    """Get all categories (public endpoint)"""
    
    query = db.query(Category)
    
    if not include_inactive:
        query = query.filter(Category.is_active == True)
    
    categories = query.all()
    
    return [CategoryResponse.model_validate(cat) for cat in categories]


@router.get("/{category_id}", response_model=CategoryResponse)
async def get_category(
    category_id: str,
    db: Session = Depends(get_db)
):
    """Get a single category by ID"""
    
    category = db.query(Category).filter(Category.id == category_id).first()
    
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )
    
    return CategoryResponse.model_validate(category)


@router.get("/slug/{slug}", response_model=CategoryResponse)
async def get_category_by_slug(
    slug: str,
    db: Session = Depends(get_db)
):
    """Get a category by slug"""
    
    category = db.query(Category).filter(Category.slug == slug).first()
    
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )
    
    return CategoryResponse.model_validate(category)


# Admin endpoints
@router.post("", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
async def create_category(
    category_data: CategoryCreate,
    current_user = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Create a new category (admin only)"""
    
    # Generate slug from name
    slug = generate_slug(category_data.name)
    
    # Check if category with same name or slug exists
    existing = db.query(Category).filter(
        (Category.name == category_data.name) | (Category.slug == slug)
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Category with this name already exists"
        )
    
    # If parent_id is provided, verify it exists
    if category_data.parent_id:
        parent = db.query(Category).filter(Category.id == category_data.parent_id).first()
        if not parent:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Parent category not found"
            )
    
    # Create category
    new_category = Category(
        name=category_data.name,
        slug=slug,
        description=category_data.description,
        icon=category_data.icon,
        parent_id=category_data.parent_id
    )
    
    db.add(new_category)
    db.commit()
    db.refresh(new_category)
    
    return CategoryResponse.model_validate(new_category)


@router.put("/{category_id}", response_model=CategoryResponse)
async def update_category(
    category_id: str,
    category_data: CategoryUpdate,
    current_user = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Update a category (admin only)"""
    
    category = db.query(Category).filter(Category.id == category_id).first()
    
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )
    
    # Update fields
    update_data = category_data.model_dump(exclude_unset=True)
    
    # If name is being updated, regenerate slug
    if "name" in update_data:
        new_slug = generate_slug(update_data["name"])
        
        # Check if new name/slug conflicts with another category
        existing = db.query(Category).filter(
            (Category.name == update_data["name"]) | (Category.slug == new_slug),
            Category.id != category_id
        ).first()
        
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Category with this name already exists"
            )
        
        category.slug = new_slug
    
    # If parent_id is being updated, verify it exists and isn't self
    if "parent_id" in update_data and update_data["parent_id"]:
        if str(update_data["parent_id"]) == str(category_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Category cannot be its own parent"
            )
        
        parent = db.query(Category).filter(Category.id == update_data["parent_id"]).first()
        if not parent:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Parent category not found"
            )
    
    for field, value in update_data.items():
        if field != "name":  # name is handled via slug
            setattr(category, field, value)
        else:
            category.name = value
    
    db.commit()
    db.refresh(category)
    
    return CategoryResponse.model_validate(category)


@router.delete("/{category_id}")
async def delete_category(
    category_id: str,
    current_user = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Delete a category (admin only)"""
    
    category = db.query(Category).filter(Category.id == category_id).first()
    
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )
    
    # Check if category has children
    children = db.query(Category).filter(Category.parent_id == category_id).first()
    if children:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete category with subcategories. Delete or reassign subcategories first."
        )
    
    # TODO: Check if category has products (when products are implemented)
    
    db.delete(category)
    db.commit()
    
    return {"message": "Category deleted successfully"}
