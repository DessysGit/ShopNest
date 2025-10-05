# ShopNest Backend

Multi-vendor e-commerce platform backend built with FastAPI.

## Setup

1. Create virtual environment:
```bash
python -m venv venv
```

2. Activate virtual environment:
```bash
# Windows
venv\Scripts\activate

# Mac/Linux
source venv/bin/activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Create `.env` file:
```bash
cp .env.example .env
```

5. Update `.env` with your Supabase database URL and other settings

6. Initialize database (after setting up Alembic):
```bash
alembic upgrade head
```

7. Run the server:
```bash
uvicorn app.main:app --reload --port 8000
```

API will be available at: http://localhost:8000
API Documentation: http://localhost:8000/docs

## Project Structure

```
backend/
├── app/
│   ├── api/          # API endpoints
│   ├── models/       # Database models
│   ├── schemas/      # Pydantic schemas
│   ├── services/     # Business logic
│   ├── utils/        # Utility functions
│   ├── middleware/   # Middleware
│   ├── config.py     # Configuration
│   ├── database.py   # Database setup
│   └── main.py       # FastAPI app
├── alembic/          # Database migrations
├── requirements.txt  # Dependencies
└── .env             # Environment variables
```
