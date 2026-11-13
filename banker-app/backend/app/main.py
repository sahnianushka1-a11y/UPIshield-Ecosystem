"""
UPIShield Banker Backend — FastAPI application.

Provides REST APIs for:
- Administrator authentication
- Customer management
- Transaction monitoring
- Infrastructure monitoring
- Failure injection and recovery
- Dashboard statistics

All data is persisted in a SQLite database.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base, SessionLocal
from app import models
from app.services import seed_database

# Create all tables
Base.metadata.create_all(bind=engine)
with SessionLocal() as db:
    seed_database(db)

app = FastAPI(
    title="UPIShield Banker Backend",
    description="Bank administration backend for the UPIShield-Ecosystem hackathon project.",
    version="1.0.0",
)

# ---------- CORS ----------
# Allow the Vite dev server (port 5173) and localhost UI to call these APIs.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------- Import routers ----------
# Importing registers the routers with the app.
from app.routers import auth, customers, transactions, infrastructure, failures, dashboard, events  # noqa: E402

app.include_router(auth.router, prefix="/auth", tags=["Authentication"])
app.include_router(customers.router, prefix="/customers", tags=["Customers"])
app.include_router(transactions.router, prefix="/transactions", tags=["Transactions"])
app.include_router(infrastructure.router, prefix="/infrastructure", tags=["Infrastructure"])
app.include_router(failures.router, prefix="/failures", tags=["Failures"])
app.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard"])
app.include_router(events.router, prefix="/events", tags=["Integration Events"])


@app.get("/health")
async def health():
    """Simple health-check endpoint. Returns 200 when the backend is running."""
    return {"status": "ok", "service": "banker-backend"}
