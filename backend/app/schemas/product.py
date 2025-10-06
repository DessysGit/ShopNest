from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime
from uuid import UUID
from decimal import Decimal


class ProductImageCreate(BaseModel):
    image_url: str
    alt_text: Optional[str] = None
    position: int = 0
    is_primary: bool = False


class ProductImageResponse(BaseModel):
    id: UUID
    product_id: UUID
    image_url: str
    alt_text: Optional[str] = None
    position: int
    is_primary: bool
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class ProductCreate(BaseModel):
    category_id: UUID
    name: str = Field(..., min_length=2, max_length=200)
    description: Optional[str] = None
    price: Decimal = Field(..., gt=0, decimal_places=2)
    compare_at_price: Optional[Decimal] = Field(None, gt=0, decimal_places=2)
    cost_per_item: Optional[Decimal] = Field(None, ge=0, decimal_places=2)
    sku: Optional[str] = None
    barcode: Optional[str] = None
    quantity: int = Field(default=0, ge=0)
    low_stock_threshold: int = Field(default=5, ge=0)
    weight: Optional[Decimal] = Field(None, ge=0, decimal_places=2)
    dimensions: Optional[dict] = None  # {length, width, height}
    is_digital: bool = False
    digital_file_url: Optional[str] = None
    images: List[ProductImageCreate] = []


class ProductUpdate(BaseModel):
    category_id: Optional[UUID] = None
    name: Optional[str] = Field(None, min_length=2, max_length=200)
    description: Optional[str] = None
    price: Optional[Decimal] = Field(None, gt=0, decimal_places=2)
    compare_at_price: Optional[Decimal] = Field(None, gt=0, decimal_places=2)
    cost_per_item: Optional[Decimal] = Field(None, ge=0, decimal_places=2)
    sku: Optional[str] = None
    barcode: Optional[str] = None
    quantity: Optional[int] = Field(None, ge=0)
    low_stock_threshold: Optional[int] = Field(None, ge=0)
    weight: Optional[Decimal] = Field(None, ge=0, decimal_places=2)
    dimensions: Optional[dict] = None
    is_digital: Optional[bool] = None
    digital_file_url: Optional[str] = None
    is_active: Optional[bool] = None
    is_featured: Optional[bool] = None


class ProductResponse(BaseModel):
    id: UUID
    seller_id: UUID
    category_id: UUID
    name: str
    slug: str
    description: Optional[str] = None
    price: Decimal
    compare_at_price: Optional[Decimal] = None
    sku: Optional[str] = None
    quantity: int
    low_stock_threshold: int
    weight: Optional[Decimal] = None
    dimensions: Optional[dict] = None
    is_digital: bool
    is_active: bool
    is_featured: bool
    views_count: int
    sales_count: int
    rating_average: Decimal
    total_reviews: int
    created_at: datetime
    images: List[ProductImageResponse] = []
    
    model_config = ConfigDict(from_attributes=True)


class ProductListResponse(BaseModel):
    """Simplified product for list views"""
    id: UUID
    seller_id: UUID
    category_id: UUID
    name: str
    slug: str
    price: Decimal
    compare_at_price: Optional[Decimal] = None
    quantity: int
    is_active: bool
    is_featured: bool
    rating_average: Decimal
    total_reviews: int
    primary_image: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)


class ProductSearchParams(BaseModel):
    search: Optional[str] = None
    category_id: Optional[UUID] = None
    min_price: Optional[Decimal] = None
    max_price: Optional[Decimal] = None
    in_stock: Optional[bool] = None
    is_featured: Optional[bool] = None
    seller_id: Optional[UUID] = None
    sort_by: Optional[str] = "created_at"  # created_at, price, rating, sales
    sort_order: Optional[str] = "desc"  # asc, desc
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)
