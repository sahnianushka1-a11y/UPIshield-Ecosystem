"""
SQLAlchemy ORM models for the Banker backend.

Each model maps to one SQLite table.
"""

from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, Text
from app.database import Base


class Customer(Base):
    """Bank customer record."""

    __tablename__ = "customers"

    id = Column(String, primary_key=True, index=True)          # e.g. CUST-001
    name = Column(String, nullable=False)
    email = Column(String, nullable=False, index=True)
    phone = Column(String, nullable=False)
    account_number = Column(String, nullable=False, unique=True, index=True)
    balance = Column(Float, nullable=False, default=0)
    status = Column(String, nullable=False, default="ACTIVE")  # ACTIVE | INACTIVE
    created_at = Column(String, nullable=False)                # ISO date string


class Transaction(Base):
    """Payment transaction record."""

    __tablename__ = "transactions"

    id = Column(String, primary_key=True, index=True)          # e.g. TXN-001
    sender_account = Column(String, nullable=False, index=True)
    receiver_account = Column(String, nullable=False, index=True)
    sender = Column(String, nullable=False)
    receiver = Column(String, nullable=False)
    amount = Column(Float, nullable=False)
    timestamp = Column(String, nullable=False)                 # e.g. "2026-11-13 10:30:00"
    status = Column(String, nullable=False, default="PENDING") # PENDING | PROCESSING | SUCCESS | FAILED | UNKNOWN
    route = Column(String, nullable=False, default="UPI")      # UPI | NEFT | IMPS
    failure_reason = Column(Text, nullable=True, default=None)
    idempotency_key = Column(String, nullable=True, unique=True, index=True)
    description = Column(Text, nullable=True, default="")


class InfrastructureService(Base):
    """Infrastructure service health record."""

    __tablename__ = "infrastructure_services"

    id = Column(String, primary_key=True, index=True)          # e.g. payment-api
    name = Column(String, nullable=False)
    status = Column(String, nullable=False, default="OPERATIONAL")  # OPERATIONAL | DEGRADED | DOWN
    latency = Column(Integer, nullable=False, default=120)     # milliseconds
    availability = Column(Float, nullable=False, default=99.9)
    last_update = Column(DateTime, nullable=False)
    failure_info = Column(Text, nullable=True, default=None)


class Failure(Base):
    """Simulated failure injection record."""

    __tablename__ = "failures"

    id = Column(String, primary_key=True, index=True)          # e.g. FAIL-0001
    service_id = Column(String, nullable=False, index=True)
    service_name = Column(String, nullable=False)
    failure_type = Column(String, nullable=False)              # API_TIMEOUT | API_UNAVAILABLE | ...
    status = Column(String, nullable=False, default="ACTIVE")  # ACTIVE | RECOVERED
    injected_at = Column(DateTime, nullable=False)
    recovered_at = Column(DateTime, nullable=True, default=None)
    integration_event_id = Column(String, nullable=True, index=True)


class ActivityEvent(Base):
    """Recent activity log entry."""

    __tablename__ = "activity_events"

    id = Column(String, primary_key=True, index=True)          # e.g. act-1
    event_type = Column(String, nullable=False)                # customer_created | transaction | alert
    message = Column(Text, nullable=False)
    time = Column(String, nullable=False)                      # e.g. "2 min ago"


class AuthUser(Base):
    """Administrator login credential (demo only)."""

    __tablename__ = "auth_users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, nullable=False, unique=True)
    password_hash = Column(String, nullable=False)
    role = Column(String, nullable=False, default="admin")


class IntegrationEvent(Base):
    """Persisted event prepared for future UPIShield delivery."""

    __tablename__ = "integration_events"

    id = Column(String, primary_key=True, index=True)
    event_type = Column(String, nullable=False)
    service = Column(String, nullable=False)
    status = Column(String, nullable=False)
    failure_type = Column(String, nullable=True)
    timestamp = Column(DateTime, nullable=False)
    source = Column(String, nullable=False, default="BANKER_SIMULATOR")
    related_event_id = Column(String, nullable=True, index=True)
