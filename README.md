# 🛍️ ShopNest

**A Modern Multi-Vendor E-Commerce Platform**

ShopNest is a full-stack marketplace where sellers can list their products and buyers can shop from multiple vendors in one place. Built with modern technologies and best practices.

---

## ✨ Features

### For Buyers
- 🔍 Browse products from multiple vendors
- 🛒 Shopping cart & wishlist
- 💳 Secure checkout with Stripe
- ⭐ Review & rate products
- 📦 Order tracking
- 🔔 Real-time notifications

### For Sellers
- 📝 Seller registration with admin approval
- 📦 Product management (CRUD)
- 📊 Sales dashboard & analytics
- 💰 Earnings tracking
- 📈 Inventory management
- 🚚 Order fulfillment tools

### For Admins
- ✅ Approve/reject seller applications
- 📊 Platform analytics
- 🗂️ Category management
- 👥 User management
- ⚙️ Platform settings

---

## 🛠️ Tech Stack

### Backend
- **FastAPI** - Modern Python web framework
- **PostgreSQL** - Database (Supabase)
- **SQLAlchemy** - ORM
- **Alembic** - Database migrations
- **JWT** - Authentication
- **Stripe** - Payment processing
- **Pydantic** - Data validation

### Frontend (Coming Soon)
- **React 18** - UI library
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Zustand** - State management
- **React Router** - Navigation
- **Axios** - API calls

---

## 📁 Project Structure

```
ShopNest/
├── backend/                  # FastAPI backend
│   ├── app/
│   │   ├── api/             # API endpoints
│   │   ├── models/          # Database models
│   │   ├── schemas/         # Pydantic schemas
│   │   ├── services/        # Business logic
│   │   ├── utils/           # Utilities
│   │   ├── middleware/      # Middleware
│   │   ├── config.py        # Configuration
│   │   ├── database.py      # DB setup
│   │   └── main.py          # FastAPI app
│   ├── alembic/             # Migrations
│   ├── requirements.txt     # Dependencies
│   └── .env                 # Environment variables
│
├── frontend/                # React frontend (coming soon)
├── SETUP.md                 # Setup instructions
└── README.md               # This file
```

---

## 🚀 Quick Start

### Prerequisites
- Python 3.9+
- Node.js 16+
- Supabase account (free)
- Stripe account (free for testing)

### Setup

See [SETUP.md](SETUP.md) for detailed instructions.

Quick version:

1. **Clone and navigate:**
```bash
cd ShopNest/backend
```

2. **Set up virtual environment:**
```bash
python -m venv venv
venv\Scripts\activate  # Windows
pip install -r requirements.txt
```

3. **Configure environment:**
```bash
copy .env.example .env
# Edit .env with your Supabase URL and other settings
```

4. **Run migrations:**
```bash
alembic upgrade head
```

5. **Start server:**
```bash
uvicorn app.main:app --reload --port 8000
```

Visit: http://localhost:8000/docs

---

## 📚 API Documentation

Once the backend is running, interactive API documentation is available at:

- **Swagger UI:** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc

### Key Endpoints

#### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/refresh` - Refresh token

#### Products (Coming Soon)
- `GET /api/products` - List products
- `POST /api/products` - Create product
- `GET /api/products/{id}` - Get product details

#### Orders (Coming Soon)
- `POST /api/orders` - Create order
- `GET /api/orders` - List user orders

---

## 🗓️ Development Roadmap

### Phase 1: Foundation ✅ (Current)
- [x] Project setup
- [x] Database schema design
- [x] User authentication
- [x] Basic API structure

### Phase 2: Core Features (In Progress)
- [ ] Seller profile management
- [ ] Product CRUD operations
- [ ] Category management
- [ ] Product search & filters
- [ ] React frontend setup

### Phase 3: E-Commerce (Upcoming)
- [ ] Shopping cart
- [ ] Wishlist
- [ ] Checkout flow
- [ ] Stripe integration
- [ ] Order management

### Phase 4: Advanced Features (Upcoming)
- [ ] Reviews & ratings
- [ ] Seller dashboard
- [ ] Admin panel
- [ ] Notifications
- [ ] Email system

### Phase 5: Polish & Deploy (Upcoming)
- [ ] Performance optimization
- [ ] Testing
- [ ] Documentation
- [ ] Deployment (Vercel + Railway)

---

## 🎓 Learning Goals

Building ShopNest teaches:
- Full-stack development
- RESTful API design
- Database design & relationships
- Authentication & authorization
- Payment processing
- State management
- Deployment & DevOps

---

## 📊 Database Schema

The platform uses a comprehensive PostgreSQL schema with:

- **Users** - Authentication & profiles
- **Seller Profiles** - Business information
- **Products** - Product catalog
- **Categories** - Product organization
- **Orders** - Order management
- **Reviews** - User feedback
- **And more...**

See the [Blueprint](BLUEPRINT.md) for complete schema details.

---

## 🤝 Contributing

This is a learning project! Feel free to:
- Report bugs
- Suggest features
- Submit pull requests
- Share feedback

---

## 📄 License

MIT License - feel free to use this project for learning!

---

## 🙏 Acknowledgments

Built with the help of:
- FastAPI documentation
- React documentation
- Stripe developer docs
- Supabase guides

---

## 📞 Support

Having issues? Check:
1. [SETUP.md](SETUP.md) for setup help
2. API docs at `/docs` endpoint
3. GitHub issues

---

**Happy Coding! 🚀**

Built with ❤️ for learning and growth
