import json
from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str
    
    # JWT
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # Stripe
    STRIPE_PUBLIC_KEY: str
    STRIPE_SECRET_KEY: str
    STRIPE_WEBHOOK_SECRET: str
    
    # Platform
    PLATFORM_COMMISSION_RATE: float = 10.0
    LOW_STOCK_THRESHOLD: int = 5
    
    # Environment
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    
    # CORS - will be parsed from JSON string in env
    CORS_ORIGINS: str = '["http://localhost:5173", "http://localhost:3000"]'
    
    @property
    def cors_origins_list(self) -> List[str]:
        """Parse CORS_ORIGINS JSON string into a list."""
        try:
            origins = json.loads(self.CORS_ORIGINS)
            return [origin for origin in origins if origin]
        except (json.JSONDecodeError, TypeError):
            return ["http://localhost:5173", "http://localhost:3000"]
    
    # Email (Mailtrap for testing)
    SMTP_HOST: str = "sandbox.smtp.mailtrap.io"
    SMTP_PORT: int = 2525
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    MAIL_FROM: str = "noreply@shopnest.com"
    MAIL_FROM_NAME: str = "ShopNest"
    
    # Frontend URL (for email links)
    FRONTEND_URL: str = "http://localhost:5173"
    
    # Logging
    LOG_LEVEL: str = "INFO"  # Can be: DEBUG, INFO, WARNING, ERROR, CRITICAL
    LOG_SQL_QUERIES: bool = False  # Set to True to see all SQL queries
    
    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"  # Ignore extra fields in .env


settings = Settings()
