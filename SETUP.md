# ShopNest - Setup Instructions

## 🎯 Step-by-Step Setup Guide

### 1. Set Up Supabase Database

1. Go to [Supabase](https://supabase.com) and sign in
2. Create a new project:
   - Project name: `shopnest` (or any name you prefer)
   - Database password: Create a strong password (save it!)
   - Region: Choose closest to you
   - Wait for project to be ready (2-3 minutes)

3. Get your database connection string:
   - Go to Project Settings (gear icon)
   - Click "Database" in the left sidebar
   - Scroll to "Connection String"
   - Copy the **URI** format (it looks like this):
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres
   ```
   - Replace `[YOUR-PASSWORD]` with your actual database password

### 2. Backend Setup

Open your terminal in the backend folder:

```bash
cd "C:\Users\GOLDN💀🖤\Documents\GitHub\ShopNest\backend"
```

1. **Create virtual environment:**
```bash
python -m venv venv
```

2. **Activate virtual environment:**
```bash
venv\Scripts\activate
```
(You should see `(venv)` at the start of your command line)

3. **Install dependencies:**
```bash
pip install -r requirements.txt
```

4. **Create .env file:**
```bash
copy .env.example .env
```

5. **Edit .env file:**
Open `.env` in VS Code and update these values:

```env
# Database - PASTE YOUR SUPABASE URL HERE
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.xxxxx.supabase.co:5432/postgres

# JWT Secret - Generate a random string (can use: openssl rand -hex 32)
SECRET_KEY=your-super-secret-random-string-change-this

# Stripe Keys (we'll add these later)
STRIPE_PUBLIC_KEY=pk_test_placeholder
STRIPE_SECRET_KEY=sk_test_placeholder
STRIPE_WEBHOOK_SECRET=whsec_placeholder
```

6. **Create database tables:**
```bash
alembic revision --autogenerate -m "Initial migration"
alembic upgrade head
```

7. **Run the backend server:**
```bash
uvicorn app.main:app --reload --port 8000
```

Your API should now be running at: http://localhost:8000
Test it by visiting: http://localhost:8000/docs

### 3. Frontend Setup (Coming Next)

We'll set this up in the next phase!

---

## 🧪 Testing the Backend

Once the server is running, visit http://localhost:8000/docs

You can test the authentication endpoints:

1. **POST /api/auth/register** - Create a new account
2. **POST /api/auth/login** - Login
3. **POST /api/auth/refresh** - Refresh your token

Try registering a buyer, seller, and admin account to test!

---

## 🐛 Troubleshooting

### Issue: "ModuleNotFoundError"
**Solution:** Make sure your virtual environment is activated

### Issue: "Connection refused" for database
**Solution:** Check your DATABASE_URL in .env file

### Issue: Alembic migration fails
**Solution:** 
1. Make sure DATABASE_URL is correct
2. Check if Supabase project is active
3. Try: `alembic stamp head` then `alembic revision --autogenerate -m "Initial"`

---

## 📝 What We've Built So Far

✅ FastAPI backend structure
✅ PostgreSQL database connection (Supabase)
✅ User authentication (JWT)
✅ User registration & login
✅ Token refresh system
✅ Database models for Users and Sellers
✅ API documentation (automatic)

## 🚀 Next Steps

Once backend is running, we'll:
1. Set up the React frontend
2. Create the seller profile system
3. Build the product management features
4. Add the shopping cart
5. Integrate Stripe payments

---

Ready to continue? Let me know once your backend is running! 🎉
