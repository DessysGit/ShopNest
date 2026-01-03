"""
Demo Data Seeder for ShopNest

Creates sample users, products, and orders for portfolio demonstration.
Run this after deploying to populate the database with demo data.

Usage:
    python seed_demo_data.py
"""

import asyncio
from sqlalchemy.orm import Session
from app.database import SessionLocal, engine
from app.models.user import User
from app.models.seller import SellerProfile, ApprovalStatus
from app.models.category import Category
from app.models.product import Product, ProductImage
from app.models.order import Order, OrderItem, OrderStatus, PaymentStatus
from app.utils.security import get_password_hash
from datetime import datetime, timedelta
import random


# Sample product data with Unsplash images
SAMPLE_PRODUCTS = [
    {
        "name": "Wireless Bluetooth Headphones",
        "description": "Premium noise-cancelling headphones with 30-hour battery life. Crystal clear sound and comfortable fit for all-day listening.",
        "price": 79.99,
        "quantity": 50,
        "category": "Electronics",
        "image": "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800"
    },
    {
        "name": "Smartphone Stand",
        "description": "Adjustable aluminum phone stand for desk. Compatible with all smartphones and tablets. Elegant design.",
        "price": 24.99,
        "quantity": 100,
        "category": "Electronics",
        "image": "https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=800"
    },
    {
        "name": "USB-C Fast Charger",
        "description": "65W USB-C wall charger with Power Delivery. Charges laptops, phones, and tablets quickly and safely.",
        "price": 34.99,
        "quantity": 75,
        "category": "Electronics",
        "image": "https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=800"
    },
    {
        "name": "Ergonomic Office Chair",
        "description": "Comfortable mesh office chair with lumbar support. Adjustable height and armrests. Perfect for long work hours.",
        "price": 199.99,
        "quantity": 25,
        "category": "Furniture",
        "image": "https://images.unsplash.com/photo-1580480055273-228ff5388ef8?w=800"
    },
    {
        "name": "Bamboo Desk Organizer",
        "description": "Eco-friendly bamboo desk organizer. Multiple compartments for pens, notes, and office supplies.",
        "price": 29.99,
        "quantity": 60,
        "category": "Furniture",
        "image": "https://images.unsplash.com/photo-1611269154421-4e27233ac5c7?w=800"
    },
    {
        "name": "LED Desk Lamp",
        "description": "Modern LED desk lamp with adjustable brightness and color temperature. USB charging port included.",
        "price": 45.99,
        "quantity": 40,
        "category": "Furniture",
        "image": "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=800"
    },
    {
        "name": "Organic Cotton T-Shirt",
        "description": "Soft organic cotton t-shirt. Available in multiple colors. Sustainable and comfortable everyday wear.",
        "price": 19.99,
        "quantity": 200,
        "category": "Clothing",
        "image": "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800"
    },
    {
        "name": "Denim Jeans - Classic Fit",
        "description": "Premium denim jeans with classic fit. Durable and stylish for any occasion.",
        "price": 59.99,
        "quantity": 80,
        "category": "Clothing",
        "image": "https://images.unsplash.com/photo-1542272604-787c3835535d?w=800"
    },
    {
        "name": "Winter Jacket",
        "description": "Warm winter jacket with water-resistant exterior. Perfect for cold weather.",
        "price": 129.99,
        "quantity": 35,
        "category": "Clothing",
        "image": "https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?w=800"
    },
    {
        "name": "Stainless Steel Water Bottle",
        "description": "Insulated stainless steel water bottle. Keeps drinks cold for 24h or hot for 12h. BPA-free.",
        "price": 24.99,
        "quantity": 120,
        "category": "Home & Kitchen",
        "image": "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=800"
    },
    {
        "name": "Non-Stick Cooking Pan Set",
        "description": "3-piece non-stick cooking pan set. Dishwasher safe and PFOA-free coating.",
        "price": 79.99,
        "quantity": 45,
        "category": "Home & Kitchen",
        "image": "https://images.unsplash.com/photo-1585515320310-259814833e62?w=800"
    },
    {
        "name": "Coffee Maker - 12 Cup",
        "description": "Programmable coffee maker with 12-cup capacity. Auto-shutoff and brew strength control.",
        "price": 89.99,
        "quantity": 30,
        "category": "Home & Kitchen",
        "image": "https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?w=800"
    },
    {
        "name": "Yoga Mat - Extra Thick",
        "description": "Extra thick yoga mat with non-slip surface. Perfect for yoga, pilates, and stretching.",
        "price": 34.99,
        "quantity": 90,
        "category": "Sports & Outdoors",
        "image": "https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=800"
    },
    {
        "name": "Resistance Bands Set",
        "description": "Set of 5 resistance bands with different strength levels. Great for home workouts.",
        "price": 19.99,
        "quantity": 150,
        "category": "Sports & Outdoors",
        "image": "https://images.unsplash.com/photo-1598289431512-b97b0917affc?w=800"
    },
    {
        "name": "Camping Tent - 4 Person",
        "description": "Weatherproof 4-person camping tent. Easy setup with included instructions.",
        "price": 149.99,
        "quantity": 20,
        "category": "Sports & Outdoors",
        "image": "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=800"
    }
]


def create_demo_data(verbose=True):
    """Create all demo data"""
    db = SessionLocal()
    
    def log(message):
        if verbose:
            print(message)

    try:
        log("🌱 Starting demo data seeding...")
        
        # 1. Create Categories
        log("\n📁 Creating categories...")
        categories = {}
        for cat_name in ["Electronics", "Furniture", "Clothing", "Home & Kitchen", "Sports & Outdoors"]:
            category = db.query(Category).filter(Category.name == cat_name).first()
            if not category:
                category = Category(
                    name=cat_name,
                    slug=cat_name.lower().replace(" & ", "-").replace(" ", "-"),
                    description=f"Browse our {cat_name.lower()} collection",
                    is_active=True
                )
                db.add(category)
                db.flush()
            categories[cat_name] = category
            log(f"  ✅ {cat_name}")
        
        db.commit()
        
        # 2. Create Admin User
        log("\n👑 Creating admin user...")
        admin = db.query(User).filter(User.email == "admin@demo.com").first()
        if not admin:
            admin = User(
                email="admin@demo.com",
                password_hash=get_password_hash("Admin123!"),
                first_name="Admin",
                last_name="User",
                role="admin",
                is_active=True
            )
            db.add(admin)
            db.commit()
            log("  ✅ admin@demo.com / Admin123!")
        else:
            log("  ℹ️  Admin already exists")
        
        # 3. Create Buyer User
        log("\n🛒 Creating buyer user...")
        buyer = db.query(User).filter(User.email == "buyer@demo.com").first()
        if not buyer:
            buyer = User(
                email="buyer@demo.com",
                password_hash=get_password_hash("Buyer123!"),
                first_name="Demo",
                last_name="Buyer",
                phone="+1234567890",
                role="buyer",
                is_active=True
            )
            db.add(buyer)
            db.commit()
            log("  ✅ buyer@demo.com / Buyer123!")
        else:
            log("  ℹ️  Buyer already exists")
        
        # 4. Create Seller Users
        log("\n💼 Creating seller users...")
        sellers_data = [
            {
                "email": "seller1@demo.com",
                "password": "Seller123!",
                "first_name": "Tech",
                "last_name": "Store",
                "business_name": "TechGear Store",
                "description": "Your one-stop shop for the latest electronics and gadgets."
            },
            {
                "email": "seller2@demo.com",
                "password": "Seller123!",
                "first_name": "Home",
                "last_name": "Essentials",
                "business_name": "Home Essentials Co",
                "description": "Quality home and lifestyle products for modern living."
            }
        ]
        
        sellers = []
        for seller_data in sellers_data:
            seller_user = db.query(User).filter(User.email == seller_data["email"]).first()
            if not seller_user:
                seller_user = User(
                    email=seller_data["email"],
                    password_hash=get_password_hash(seller_data["password"]),
                    first_name=seller_data["first_name"],
                    last_name=seller_data["last_name"],
                    role="seller",
                    is_active=True
                )
                db.add(seller_user)
                db.flush()
                
                # Create seller profile
                seller_profile = SellerProfile(
                    user_id=seller_user.id,
                    business_name=seller_data["business_name"],
                    business_description=seller_data["description"],
                    business_address="123 Demo Street, Demo City, DC 12345",
                    tax_id="XX-XXXXXXX",
                    approval_status=ApprovalStatus.APPROVED,
                    commission_rate=10.0
                )
                db.add(seller_profile)
                db.flush()
                sellers.append(seller_profile)
                log(f"  ✅ {seller_data['email']} / {seller_data['password']}")
            else:
                seller_profile = db.query(SellerProfile).filter(
                    SellerProfile.user_id == seller_user.id
                ).first()
                if seller_profile:
                    sellers.append(seller_profile)
                log(f"  ℹ️  {seller_data['email']} already exists")
        
        db.commit()
        
        # 5. Create Products
        log("\n📦 Creating products...")
        products_created = 0
        for i, product_data in enumerate(SAMPLE_PRODUCTS):
            # Assign products alternately to sellers
            seller = sellers[i % len(sellers)]
            
            # Generate unique slug by including seller index if needed
            base_slug = product_data["name"].lower().replace(" ", "-")
            slug = base_slug
            
            # Check if product with this slug already exists
            existing_by_slug = db.query(Product).filter(Product.slug == slug).first()
            if existing_by_slug:
                # If slug exists, skip this product (already seeded)
                log(f"  ℹ️  {product_data['name']} (already exists)")
                continue
            
            # Create new product
            product = Product(
                seller_id=seller.id,
                category_id=categories[product_data["category"]].id,
                name=product_data["name"],
                slug=slug,
                description=product_data["description"],
                price=product_data["price"],
                quantity=product_data["quantity"],
                sku=f"DEMO-{i+1:03d}",
                is_active=True
            )
            db.add(product)
            db.flush()
            
            # Add product image
            image = ProductImage(
                product_id=product.id,
                image_url=product_data["image"],
                is_primary=True
            )
            db.add(image)
            products_created += 1
            log(f"  ✅ {product_data['name']}")
        
        db.commit()
        log(f"\n  📦 Total products created: {products_created}")
        
        # 6. Create Sample Orders
        log("\n🛍️  Creating sample orders...")
        orders_created = 0
        
        # Get some products for orders
        all_products = db.query(Product).limit(5).all()
        
        for i in range(3):
            # Create order
            order_number = f"ORD-DEMO{i+1:03d}"
            existing_order = db.query(Order).filter(Order.order_number == order_number).first()
            
            if not existing_order:
                # Select 2-3 random products
                order_products = random.sample(all_products, random.randint(2, 3))
                
                subtotal = sum(p.price * random.randint(1, 2) for p in order_products)
                platform_fee = float(subtotal) * 0.10
                total = float(subtotal)
                
                order = Order(
                    order_number=order_number,
                    buyer_id=buyer.id,
                    status=random.choice([OrderStatus.CONFIRMED, OrderStatus.SHIPPED, OrderStatus.DELIVERED]),
                    payment_status=PaymentStatus.PAID,
                    subtotal=subtotal,
                    platform_fee=platform_fee,
                    shipping_cost=0,
                    tax=0,
                    total=total,
                    payment_method="Demo Card",
                    shipping_address={
                        "full_name": "Demo Buyer",
                        "street_address": "123 Demo Street",
                        "city": "Demo City",
                        "state": "DC",
                        "postal_code": "12345",
                        "country": "United States"
                    },
                    billing_address={
                        "full_name": "Demo Buyer",
                        "street_address": "123 Demo Street",
                        "city": "Demo City",
                        "state": "DC",
                        "postal_code": "12345",
                        "country": "United States"
                    },
                    created_at=datetime.utcnow() - timedelta(days=random.randint(1, 7))
                )
                db.add(order)
                db.flush()
                
                # Create order items
                for product in order_products:
                    quantity = random.randint(1, 2)
                    item_subtotal = float(product.price) * quantity
                    item_platform_fee = item_subtotal * 0.10
                    item_seller_earning = item_subtotal - item_platform_fee
                    
                    order_item = OrderItem(
                        order_id=order.id,
                        product_id=product.id,
                        seller_id=product.seller_id,
                        product_name=product.name,
                        quantity=quantity,
                        price=product.price,
                        subtotal=item_subtotal,
                        platform_fee=item_platform_fee,
                        seller_earning=item_seller_earning,
                        status=order.status
                    )
                    db.add(order_item)
                
                orders_created += 1
                log(f"  ✅ Order {order_number}")
        
        db.commit()
        log(f"\n  🛍️  Total orders created: {orders_created}")
        
        # Summary
        log("\n" + "="*60)
        log("✨ Demo data seeding completed successfully!")
        log("="*60)
        log("\n📊 Summary:")
        log(f"  • Categories: {len(categories)}")
        log(f"  • Users: 1 admin, 1 buyer, {len(sellers)} sellers")
        log(f"  • Products: {products_created}")
        log(f"  • Orders: {orders_created}")
        
        log("\n🔐 Demo Credentials:")
        log("  Admin:  admin@demo.com / Admin123!")
        log("  Seller: seller1@demo.com / Seller123!")
        log("  Seller: seller2@demo.com / Seller123!")
        log("  Buyer:  buyer@demo.com / Buyer123!")
        
        log("\n✅ Your database is ready for demo!")
        log("="*60)
        
    except Exception as e:
        print(f"\n❌ Error seeding data: {str(e)}") # Always show errors
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    import sys
    quiet = "--quiet" in sys.argv
    
    if not quiet:
        print("🚀 ShopNest Demo Data Seeder")
        print("="*60)
    
    create_demo_data(verbose=not quiet)
