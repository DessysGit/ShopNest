# 🚀 ShopNest Development Guide

## 📋 Table of Contents
1. [Quick Start](#quick-start)
2. [Project Status](#project-status)
3. [Backend Implementation](#backend-implementation)
4. [Features Overview](#features-overview)
5. [API Endpoints](#api-endpoints)
6. [Testing](#testing)
7. [Troubleshooting](#troubleshooting)
8. [Customization](#customization)

---

## 🎯 Quick Start

### Frontend
```bash
cd frontend
npm install
npm run dev
# Visit: http://localhost:5173
```

### Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
source venv/bin/activate  # Mac/Linux
pip install -r requirements.txt
uvicorn app.main:app --reload
# Visit: http://localhost:8000/docs
```

---

## 📊 Project Status

**Frontend:** ✅ 100% Complete  
**Backend:** 🔄 Admin APIs ✅ | Orders APIs ⏳  

### Completed ✅
- Admin seller management (fully working)
- Checkout flow (3-step process)
- Buyer order management UI
- Seller order management UI
- Cart with persistence
- All authentication & routing

### Needs Implementation 🔄
- Orders API endpoints
- Payment integration (Stripe)
- Email notifications

---

## 🎨 Features Overview

### ✅ Admin Features
- View all sellers (with filters)
- Approve/reject sellers with reasons
- Suspend/reactivate sellers
- Dashboard with statistics

### ✅ Buyer Features
- Browse & search products
- Add to cart (persists in localStorage)
- 3-step checkout process
- View orders & track status
- Cancel orders (pending/confirmed)

### ✅ Seller Features  
- Create seller profile
- Add/edit products
- View orders for your products
- Update order status with tracking
- View earnings breakdown

---

## 📡 API Endpoints

### Authentication
- `POST /auth/register` - Register user
- `POST /auth/login` - Login
- `POST /auth/refresh` - Refresh token
- `GET /auth/me` - Get current user

### Admin
- ✅ `GET /admin/sellers/all` - All sellers
- ✅ `POST /admin/sellers/:id/approval` - Approve/reject
- ✅ `PUT /admin/sellers/:id/suspend` - Suspend
- ✅ `PUT /admin/sellers/:id/reactivate` - Reactivate
- ✅ `GET /admin/dashboard` - Dashboard stats

### Orders (Need Implementation)
- ✅ `POST /orders` - Create order
- ✅ `GET /orders` - List user orders
- ✅ `GET /orders/:id` - Order details
- ✅ `PUT /orders/:id/cancel` - Cancel order

### Seller Orders (Need Implementation)
- ✅ `GET /sellers/orders` - Seller's orders
- ✅ `PUT /sellers/orders/:id/status` - Update status

---

## 🧪 Testing

### Test with Postman

1. **Create Order:**
```json
POST http://localhost:8000/orders
Authorization: Bearer {token}
{
  "items": [
    {"product_id": "uuid", "quantity": 2, "price": 29.99}
  ],
  "shipping_address": {
    "first_name": "John",
    "last_name": "Doe",
    "address_line1": "123 Main St",
    "city": "Accra",
    "state": "Greater Accra",
    "postal_code": "00233",
    "country": "Ghana",
    "phone": "+233123456789",
    "email": "john@example.com"
  },
  "billing_address": {...},
  "payment_method": "card",
  "subtotal": 59.98,
  "shipping_cost": 15.00,
  "tax": 9.37,
  "total": 84.35
}
```

2. **Update Order Status (Seller):**
```json
PUT http://localhost:8000/sellers/orders/{id}/status
Authorization: Bearer {seller_token}
{
  "status": "shipped",
  "tracking_number": "TRACK123456"
}
```

### Frontend Testing Checklist
- [ ] Login/logout works
- [ ] Cart persists on refresh
- [ ] Checkout redirects to login if not authenticated
- [ ] Orders display correctly
- [ ] Seller can update order status
- [ ] Admin can approve sellers

---

## 🐛 Troubleshooting

### CORS Errors
```python
# backend/app/main.py
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Database Issues
```bash
# Reset database
alembic downgrade base
alembic upgrade head
```

### Port Already in Use
```bash
# Kill process on port 8000
# Windows
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# Mac/Linux
lsof -ti:8000 | xargs kill -9
```

---

## ⚙️ Customization

### Change Tax Rate
```javascript
// frontend/src/pages/Checkout.jsx (line ~40)
const tax = subtotal * 0.125;  // 12.5% - Change as needed
```

### Change Commission Rate
```python
# Default is in seller_profiles table: commission_rate
# Update in database or during seller approval
```

### Change Free Shipping Threshold
```javascript
// frontend/src/pages/Checkout.jsx (line ~39)
const shippingCost = subtotal > 100 ? 0 : 15;
```

### Change Colors
```javascript
// frontend/tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eef2ff',
          // ... customize colors
        }
      }
    }
  }
}
```

## 🚀 Deployment

### Frontend (Vercel)
```bash
cd frontend
npm run build
# Deploy dist folder to Vercel
```

### Backend (Railway)
```bash
# Push to GitHub
# Connect Railway to your repo
# Add environment variables
# Deploy automatically
```

---

## 📞 Support

**Need Help?**
- Check API docs: http://localhost:8000/docs
- Review frontend code: `frontend/src/pages`
- Check backend models: `backend/app/models`

---

**Status:** Frontend 100% | Backend Admin ✅  
**Last Updated:** October 10, 2025
