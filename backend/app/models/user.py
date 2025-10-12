from sqlalchemy import Column, String, Boolean, DateTime, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
import enum
from app.database import Base


class UserRole(str, enum.Enum):
    BUYER = "buyer"
    SELLER = "seller"
    ADMIN = "admin"


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    first_name = Column(String)
    last_name = Column(String)
    phone = Column(String)
    role = Column(SQLEnum(UserRole), nullable=False, default=UserRole.BUYER)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    seller_profile = relationship("SellerProfile", back_populates="user", uselist=False)

    def __repr__(self):
        return f"<User {self.email}>"
