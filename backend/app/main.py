from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging
from app.config import settings
from app.api import auth, sellers, admin, categories, products, orders, payments, reviews, platform_settings, recommendations, wishlist

# Configure uvicorn access logger to filter out /health requests
class HealthCheckLogFilter(logging.Filter):
    """Filter to suppress access logs for /health endpoint"""
    def filter(self, record):
        if hasattr(record, 'args') and len(record.args) >= 3:
            # Check if the request path is /health
            request_line = record.args[0] if isinstance(record.args[0], str) else ''
            if '/health' in request_line:
                return False
        return True

# Apply the filter to uvicorn access logger
logging.getLogger('uvicorn.access').addFilter(HealthCheckLogFilter())

# Create FastAPI app
app = FastAPI(
    title="ShopNest API",
    description="Multi-Vendor E-Commerce Platform API",
    version="1.0.0"
)

# Configure CORS - Include production frontend URL
allowed_origins = settings.cors_origins_list.copy()
if settings.FRONTEND_URL and settings.FRONTEND_URL not in allowed_origins:
    allowed_origins.append(settings.FRONTEND_URL)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api")
app.include_router(sellers.router, prefix="/api")
app.include_router(admin.router, prefix="/api")
app.include_router(platform_settings.router, prefix="/api")  # Platform settings endpoints
app.include_router(categories.router, prefix="/api")
app.include_router(products.router, prefix="/api")
app.include_router(orders.router, prefix="/api")
app.include_router(payments.router, prefix="/api")
app.include_router(reviews.router, prefix="/api")
app.include_router(recommendations.router, prefix="/api")  # Product recommendations
app.include_router(wishlist.router, prefix="/api")  # Wishlist endpoints


@app.get("/")
async def root():
    return {
        "message": "Welcome to ShopNest API",
        "version": "1.0.0",
        "docs": "/docs"
    }


@app.get("/health")
async def health_check():
    """
    Health check endpoint for monitoring and keep-alive pings.
    Used by UptimeRobot and frontend to prevent Render free tier from sleeping.
    """
    from datetime import datetime
    return {
        "status": "healthy",
        "service": "ShopNest API",
        "timestamp": datetime.utcnow().isoformat(),
        "environment": settings.ENVIRONMENT
    }