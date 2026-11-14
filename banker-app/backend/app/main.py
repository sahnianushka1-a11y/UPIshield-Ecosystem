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
from sqlalchemy import inspect, text
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base, SessionLocal
from app import models
from app.services import seed_database

# Create all tables
Base.metadata.create_all(bind=engine)
with engine.begin() as connection:
    transaction_columns = {column["name"] for column in inspect(engine).get_columns("transactions")}
    if "idempotency_key" not in transaction_columns:
        connection.execute(text("ALTER TABLE transactions ADD COLUMN idempotency_key VARCHAR"))
    if "description" not in transaction_columns:
        connection.execute(text("ALTER TABLE transactions ADD COLUMN description TEXT"))
    existing_columns = {column["name"] for column in inspect(engine).get_columns("failures")}
    if "integration_event_id" not in existing_columns:
        connection.execute(text("ALTER TABLE failures ADD COLUMN integration_event_id VARCHAR"))
    event_columns = {column["name"] for column in inspect(engine).get_columns("integration_events")}
    if "related_event_id" not in event_columns:
        connection.execute(text("ALTER TABLE integration_events ADD COLUMN related_event_id VARCHAR"))
with SessionLocal() as db:
    seed_database(db)

app = FastAPI(
    title="UPIShield Banker Backend",
    description="Bank administration backend for the UPIShield-Ecosystem hackathon project.",
    version="1.0.0",
)

# ---------- CORS ----------
# Allow the Vite dev servers (ports 5173, 5174, 5175) and localhost UI to call these APIs.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:5175",
        "http://127.0.0.1:5175",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------- Import routers ----------
# Importing registers the routers with the app.
from app.routers import auth, customers, transactions, infrastructure, failures, dashboard, events, customer_api  # noqa: E402

app.include_router(auth.router, prefix="/auth", tags=["Authentication"])
app.include_router(customers.router, prefix="/customers", tags=["Customers"])
app.include_router(transactions.router, prefix="/transactions", tags=["Transactions"])
app.include_router(infrastructure.router, prefix="/infrastructure", tags=["Infrastructure"])
app.include_router(failures.router, prefix="/failures", tags=["Failures"])
app.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard"])
app.include_router(events.router, prefix="/events", tags=["Integration Events"])
app.include_router(customer_api.router)


@app.get("/health")
async def health():
    """Simple health-check endpoint. Returns 200 when the backend is running."""
    return {"status": "ok", "service": "banker-backend"}
