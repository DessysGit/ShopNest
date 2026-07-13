from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime
from uuid import UUID


class WishlistItemBase(BaseModel):
    product_id: UUID


class WishlistItemCreate(WishlistItemBase):
    pass


class WishlistItemResponse(WishlistItemBase):
    id: UUID
    user_id: UUID
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class WishlistItemWithProduct(WishlistItemResponse):
    product: Optional[dict] = None  # Will contain product details