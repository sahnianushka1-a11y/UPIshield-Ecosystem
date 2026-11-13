"""
Service layer — business logic for the Banker backend.

Each function performs database operations and returns
Pydantic-compatible dictionaries.
"""

from datetime import datetime
from sqlalchemy.orm import Session
from app.models import Customer, Transaction, InfrastructureService, Failure, ActivityEvent, AuthUser, IntegrationEvent
from app.seed import seed_customers, seed_transactions, seed_transactions_part2, seed_infrastructure, seed_activities, seed_auth_users


def seed_database(db: Session):
    """Populate the database with sample data if it is empty."""
    if db.query(Customer).count() > 0:
        return

    for obj in seed_customers():
        db.add(obj)
    for obj in seed_transactions():
        db.add(obj)
    for obj in seed_transactions_part2():
        db.add(obj)
    for obj in seed_infrastructure():
        db.add(obj)
    for obj in seed_activities():
        db.add(obj)
    for obj in seed_auth_users():
        db.add(obj)
    db.commit()


def authenticate_user(db: Session, email: str, password: str) -> dict | None:
    """Check credentials against the auth_users table."""
    user = db.query(AuthUser).filter(AuthUser.email == email).first()
    if user and user.password_hash == password:
        return {"id": user.id, "email": user.email, "role": user.role}
    return None


def get_all_customers(db: Session) -> list[Customer]:
    return db.query(Customer).order_by(Customer.created_at.desc()).all()


def get_customer_by_id(db: Session, customer_id: str) -> Customer | None:
    return db.query(Customer).filter(Customer.id == customer_id).first()


def create_customer(db: Session, name: str, email: str, phone: str, initial_deposit: float) -> Customer:
    max_id = db.query(Customer).filter(Customer.id.like("CUST-%")).order_by(Customer.id.desc()).first()
    next_num = (int(max_id.id.split("-")[1]) + 1) if max_id else 1
    customer_id = f"CUST-{next_num:03d}"

    max_acc = db.query(Customer).filter(Customer.account_number.like("ACC-%")).order_by(Customer.account_number.desc()).first()
    next_acc = (int(max_acc.account_number.split("-")[1]) + 1) if max_acc else 10001
    account_number = f"ACC-{next_acc}"

    customer = Customer(
        id=customer_id, name=name, email=email, phone=phone,
        account_number=account_number, balance=initial_deposit,
        status="ACTIVE", created_at=datetime.now().strftime("%Y-%m-%d"),
    )
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return customer


def update_customer_status(db: Session, customer_id: str, status: str) -> Customer | None:
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if customer:
        customer.status = status
        db.commit()
        db.refresh(customer)
    return customer


def create_integration_event(db: Session, event_type: str, service: str, status: str, failure_type: str | None = None) -> IntegrationEvent:
    event = IntegrationEvent(
        id=f"event-{datetime.now().strftime('%Y%m%d%H%M%S%f')}",
        event_type=event_type,
        service=service,
        status=status,
        failure_type=failure_type,
        timestamp=datetime.now(),
        source="BANKER_SIMULATOR",
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return event
def get_all_transactions(db: Session, status: str = None, search: str = None, date: str = None) -> list[Transaction]:
    query = db.query(Transaction).order_by(Transaction.timestamp.desc())
    if status:
        query = query.filter(Transaction.status == status)
    if search:
        q = f"%{search}%"
        query = query.filter(
            Transaction.id.ilike(q) |
            Transaction.sender.ilike(q) |
            Transaction.receiver.ilike(q) |
            Transaction.sender_account.ilike(q) |
            Transaction.receiver_account.ilike(q)
        )
    if date:
        query = query.filter(Transaction.timestamp.startswith(date))
    return query.all()


def get_transaction_by_id(db: Session, transaction_id: str) -> Transaction | None:
    return db.query(Transaction).filter(Transaction.id == transaction_id).first()


def get_all_infrastructure(db: Session) -> list[InfrastructureService]:
    return db.query(InfrastructureService).all()


def update_infrastructure_service(db: Session, service_id: str, **kwargs) -> InfrastructureService | None:
    svc = db.query(InfrastructureService).filter(InfrastructureService.id == service_id).first()
    if svc:
        for key, value in kwargs.items():
            setattr(svc, key, value)
        svc.last_update = datetime.now()
        db.commit()
        db.refresh(svc)
    return svc


def get_active_failures(db: Session) -> list[Failure]:
    return db.query(Failure).filter(Failure.status == "ACTIVE").order_by(Failure.injected_at.desc()).all()


def get_all_failures(db: Session) -> list[Failure]:
    return db.query(Failure).order_by(Failure.injected_at.desc()).all()


def create_failure(db: Session, service_id: str, service_name: str, failure_type: str) -> Failure:
    max_fail = db.query(Failure).order_by(Failure.id.desc()).first()
    next_num = (int(max_fail.id.split("-")[1]) + 1) if max_fail and max_fail.id.startswith("FAIL-") else 1
    failure_id = f"FAIL-{next_num:04d}"

    failure = Failure(
        id=failure_id, service_id=service_id, service_name=service_name,
        failure_type=failure_type, status="ACTIVE",
        injected_at=datetime.now(),
    )
    db.add(failure)
    db.commit()
    db.refresh(failure)
    return failure


def recover_failure(db: Session, failure_id: str) -> Failure | None:
    failure = db.query(Failure).filter(Failure.id == failure_id).first()
    if failure:
        failure.status = "RECOVERED"
        failure.recovered_at = datetime.now()
        db.commit()
        db.refresh(failure)
    return failure


def add_activity_event(db: Session, event_type: str, message: str) -> ActivityEvent:
    event = ActivityEvent(
        id=f"act-{datetime.now().microsecond % 10000:04d}",
        event_type=event_type,
        message=message,
        time="Just now",
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


def get_dashboard_stats(db: Session) -> dict:
    customers = db.query(Customer).all()
    transactions = db.query(Transaction).all()
    active_failures = db.query(Failure).filter(Failure.status == "ACTIVE").all()
    activities = db.query(ActivityEvent).order_by(ActivityEvent.id.desc()).limit(20).all()

    total_volume = sum(t.amount for t in transactions)
    successful = sum(1 for t in transactions if t.status == "SUCCESS")
    failed = sum(1 for t in transactions if t.status == "FAILED")
    pending = sum(1 for t in transactions if t.status == "PENDING")
    active_count = len(active_failures)

    return {
        "total_customers": len(customers),
        "total_transactions": len(transactions),
        "total_volume": f"Rs.{total_volume:,.0f}",
        "successful_transactions": successful,
        "failed_transactions": failed,
        "pending_transactions": pending,
        "infrastructure_health": "OPERATIONAL" if active_count == 0 else "DEGRADED",
        "active_alerts": active_count,
        "recent_activity": [
            {
                "id": a.id,
                "event_type": a.event_type,
                "message": a.message,
                "time": a.time,
            }
            for a in activities
        ],
    }


def get_recent_activities(db: Session, limit: int = 20) -> list[ActivityEvent]:
    return db.query(ActivityEvent).order_by(ActivityEvent.id.desc()).limit(limit).all()
