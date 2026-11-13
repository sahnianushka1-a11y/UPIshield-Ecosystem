"""
Seed data for the Banker database.

Populates the database with realistic sample data that matches
the frontend's initial mock data, so both sides start from the
same baseline.
"""

from datetime import datetime
from app.models import Customer, Transaction, InfrastructureService, ActivityEvent, AuthUser


def seed_customers():
    """Return a list of Customer ORM objects for seeding."""
    return [
        Customer(
            id="CUST-001", name="Rahul Sharma", email="rahul@example.com",
            phone="+91 98765 43210", account_number="ACC-10001",
            balance=54200, status="ACTIVE", created_at="2026-10-01",
        ),
        Customer(
            id="CUST-002", name="Ananya Patel", email="ananya@example.com",
            phone="+91 98765 43211", account_number="ACC-10002",
            balance=128500, status="ACTIVE", created_at="2026-10-05",
        ),
        Customer(
            id="CUST-003", name="Vikram Singh", email="vikram@example.com",
            phone="+91 98765 43212", account_number="ACC-10003",
            balance=0, status="INACTIVE", created_at="2026-10-10",
        ),
        Customer(
            id="CUST-004", name="Priya Nair", email="priya@example.com",
            phone="+91 98765 43213", account_number="ACC-10004",
            balance=76300, status="ACTIVE", created_at="2026-10-15",
        ),
        Customer(
            id="CUST-005", name="Arjun Reddy", email="arjun@example.com",
            phone="+91 98765 43214", account_number="ACC-10005",
            balance=31000, status="ACTIVE", created_at="2026-10-20",
        ),
    ]


def seed_transactions():
    """Return a list of Transaction ORM objects for seeding."""
    return [
        Transaction(
            id="TXN-001", sender_account="ACC-10001", receiver_account="ACC-10002",
            sender="Rahul Sharma", receiver="Ananya Patel", amount=12500,
            timestamp="2026-11-13 10:30:00", status="SUCCESS", route="UPI",
            failure_reason=None,
        ),
        Transaction(
            id="TXN-002", sender_account="ACC-10002", receiver_account="ACC-10004",
            sender="Ananya Patel", receiver="Priya Nair", amount=45000,
            timestamp="2026-11-13 10:25:00", status="SUCCESS", route="NEFT",
            failure_reason=None,
        ),
        Transaction(
            id="TXN-003", sender_account="ACC-10003", receiver_account="ACC-10001",
            sender="Vikram Singh", receiver="Rahul Sharma", amount=3200,
            timestamp="2026-11-13 10:20:00", status="FAILED", route="UPI",
            failure_reason="Insufficient balance",
        ),
        Transaction(
            id="TXN-004", sender_account="ACC-10004", receiver_account="ACC-10005",
            sender="Priya Nair", receiver="Arjun Reddy", amount=8750,
            timestamp="2026-11-13 10:15:00", status="PENDING", route="UPI",
            failure_reason=None,
        ),
        Transaction(
            id="TXN-005", sender_account="ACC-10001", receiver_account="ACC-10003",
            sender="Rahul Sharma", receiver="Vikram Singh", amount=15000,
            timestamp="2026-11-13 10:10:00", status="PROCESSING", route="IMPS",
            failure_reason=None,
        ),
    ]


def seed_transactions_part2():
    """Return the second batch of Transaction ORM objects."""
    return [
        Transaction(
            id="TXN-006", sender_account="ACC-10005", receiver_account="ACC-10002",
            sender="Arjun Reddy", receiver="Ananya Patel", amount=22000,
            timestamp="2026-11-13 10:05:00", status="SUCCESS", route="UPI",
            failure_reason=None,
        ),
        Transaction(
            id="TXN-007", sender_account="ACC-10002", receiver_account="ACC-10001",
            sender="Ananya Patel", receiver="Rahul Sharma", amount=5600,
            timestamp="2026-11-13 09:58:00", status="UNKNOWN", route="UPI",
            failure_reason=None,
        ),
        Transaction(
            id="TXN-008", sender_account="ACC-10003", receiver_account="ACC-10004",
            sender="Vikram Singh", receiver="Priya Nair", amount=9900,
            timestamp="2026-11-13 09:50:00", status="FAILED", route="NEFT",
            failure_reason="Account frozen",
        ),
        Transaction(
            id="TXN-009", sender_account="ACC-10001", receiver_account="ACC-10005",
            sender="Rahul Sharma", receiver="Arjun Reddy", amount=33000,
            timestamp="2026-11-13 09:45:00", status="SUCCESS", route="NEFT",
            failure_reason=None,
        ),
        Transaction(
            id="TXN-010", sender_account="ACC-10004", receiver_account="ACC-10003",
            sender="Priya Nair", receiver="Vikram Singh", amount=7200,
            timestamp="2026-11-13 09:30:00", status="PENDING", route="UPI",
            failure_reason=None,
        ),
    ]

def seed_infrastructure():
    """Return a list of InfrastructureService ORM objects for seeding."""
    now = datetime.now()
    return [
        InfrastructureService(
            id="payment-api", name="Payment API", status="OPERATIONAL",
            latency=120, availability=99.9, last_update=now, failure_info=None,
        ),
        InfrastructureService(
            id="auth-api", name="Authentication API", status="OPERATIONAL",
            latency=85, availability=99.95, last_update=now, failure_info=None,
        ),
        InfrastructureService(
            id="bank-db", name="Bank Database", status="OPERATIONAL",
            latency=45, availability=100, last_update=now, failure_info=None,
        ),
        InfrastructureService(
            id="upi-gateway", name="UPI Gateway", status="OPERATIONAL",
            latency=200, availability=99.8, last_update=now, failure_info=None,
        ),
        InfrastructureService(
            id="payment-processor", name="Payment Processing Service",
            status="OPERATIONAL", latency=200, availability=99.8,
            last_update=now, failure_info=None,
        ),
        InfrastructureService(
            id="external-payments", name="External Payment Dependencies",
            status="OPERATIONAL", latency=340, availability=99.5,
            last_update=now, failure_info=None,
        ),
    ]


def seed_activities():
    """Return a list of ActivityEvent ORM objects for seeding."""
    return [
        ActivityEvent(id="act-1", event_type="customer_created",
                      message="New customer R. Sharma registered", time="2 min ago"),
        ActivityEvent(id="act-2", event_type="transaction",
                      message="UPI transfer Rs.12,500 completed", time="5 min ago"),
        ActivityEvent(id="act-3", event_type="alert",
                      message="API latency spike on Payment Gateway", time="12 min ago"),
        ActivityEvent(id="act-4", event_type="customer_created",
                      message="New customer A. Patel registered", time="18 min ago"),
        ActivityEvent(id="act-5", event_type="transaction",
                      message="NEFT transfer Rs.45,000 processed", time="25 min ago"),
    ]


def seed_auth_users():
    """Return a list of AuthUser ORM objects for seeding."""
    return [
        AuthUser(
            id=1, email="admin@bank.com",
            password_hash="admin123", role="admin",
        ),
    ]

