from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.api import auth, sellers, admin, categories, products, orders, payments, reviews, platform_settings, recommendations

# Create FastAPI app
app = FastAPI(
    title="ShopNest API",
    description="Multi-Vendor E-Commerce Platform API",
    version="1.0.0"
)

# Configure CORS - Include production frontend URL
allowed_origins = settings.CORS_ORIGINS.copy()
if settings.FRONTEND_URL and settings.FRONTEND_URL not in allowed_origins:
    allowed_origins.append(settings.FRONTEND_URL)

# Remove empty strings
allowed_origins = [origin for origin in allowed_origins if origin]

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
