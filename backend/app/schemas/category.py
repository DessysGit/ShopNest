from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime
from uuid import UUID


class CategoryCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    description: Optional[str] = None
    icon: Optional[str] = None
    parent_id: Optional[UUID] = None


class CategoryUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    description: Optional[str] = None
    icon: Optional[str] = None
    parent_id: Optional[UUID] = None
    is_active: Optional[bool] = None


class CategoryResponse(BaseModel):
    id: UUID
    name: str
    slug: str
    description: Optional[str] = None
    icon: Optional[str] = None
    parent_id: Optional[UUID] = None
    is_active: bool
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class CategoryWithChildren(CategoryResponse):
    """Category with nested children (for tree view)"""
    children: list['CategoryWithChildren'] = []
