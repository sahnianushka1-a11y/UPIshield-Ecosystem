"""Customer-facing payment API shared by the Customer app."""

import secrets
from datetime import datetime

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Customer, Transaction
from app.services import get_active_failures

router = APIRouter(prefix="/customer-api", tags=["Customer payments"])
_sessions: dict[str, str] = {}
PAYMENT_FAILURE_SERVICES = {
    "payment-api",
    "bank-db",
    "upi-gateway",
    "payment-processor",
    "external-payments",
}


class LoginRequest(BaseModel):
    customer_id: str
    password: str


class PaymentRequest(BaseModel):
    idempotency_key: str = Field(min_length=16, max_length=64)
    recipient_id: str
    amount_paise: int = Field(gt=0)
    description: str = ""


def _customer_id(value: str) -> str:
    return {"CUST1001": "CUST-001", "CUST1002": "CUST-002"}.get(value, value)


def _require_customer(authorization: str | None, db: Session) -> Customer:
    token = (authorization or "").removeprefix("Bearer ").strip()
    customer_id = _sessions.get(token)
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(401, "Invalid customer session")
    return customer


def _public(transaction: Transaction) -> dict:
    return {
        "transaction_id": transaction.id,
        "status": transaction.status,
        "failure_reason": transaction.failure_reason,
        "amount_paise": round(transaction.amount * 100),
        "created_at": transaction.timestamp,
        "idempotency_key": transaction.idempotency_key,
    }


@router.post("/login")
def login(body: LoginRequest, db: Session = Depends(get_db)):
    customer = db.query(Customer).filter(Customer.id == _customer_id(body.customer_id)).first()
    if not customer or body.password != "demo123" or customer.status != "ACTIVE":
        raise HTTPException(401, "Invalid customer ID or password")
    token = secrets.token_urlsafe(32)
    _sessions[token] = customer.id
    return {"access_token": token, "token_type": "bearer", "customer_id": body.customer_id}


@router.get("/profile")
def profile(
    authorization: str | None = Header(None),
    db: Session = Depends(get_db),
):
    customer = _require_customer(authorization, db)
    return {
        "customer_id": customer.id.replace("CUST-", "CUST"),
        "name": customer.name,
        "masked_account_number": customer.account_number,
    }


@router.get("/balance")
def balance(authorization: str | None = Header(None), db: Session = Depends(get_db)):
    return {"balance": _require_customer(authorization, db).balance}


@router.get("/transactions")
def transactions(authorization: str | None = Header(None), db: Session = Depends(get_db)):
    customer = _require_customer(authorization, db)
    rows = db.query(Transaction).filter(
        (Transaction.sender_account == customer.account_number)
        | (Transaction.receiver_account == customer.account_number)
    ).order_by(Transaction.timestamp.desc()).limit(100).all()
    return [
        {
            "transaction_id": row.id,
            "direction": "DEBIT" if row.sender_account == customer.account_number else "CREDIT",
            "counterparty_id": row.receiver_account if row.sender_account == customer.account_number else row.sender_account,
            "amount": row.amount,
            "description": row.description or "",
            "status": row.status,
            "created_at": row.timestamp,
        }
        for row in rows
    ]


@router.post("/payments")
def payment(
    body: PaymentRequest,
    authorization: str | None = Header(None),
    db: Session = Depends(get_db),
):
    customer = _require_customer(authorization, db)
    existing = db.query(Transaction).filter(Transaction.idempotency_key == body.idempotency_key).first()
    if existing:
        return {**_public(existing), "duplicate": True}

    recipient = db.query(Customer).filter(Customer.id == _customer_id(body.recipient_id)).first()
    failure = next(
        (
            item
            for item in get_active_failures(db)
            if item.service_id in PAYMENT_FAILURE_SERVICES
        ),
        None,
    )
    status = "SUCCESS"
    reason = None
    if not recipient:
        status, reason = "FAILED", "Recipient account not found"
    elif recipient.id == customer.id:
        status, reason = "FAILED", "Cannot pay your own account"
    elif customer.balance < body.amount_paise / 100:
        status, reason = "FAILED", "Insufficient balance"
    elif failure:
        status, reason = "FAILED", f"Bank service failure: {failure.failure_type}"

    transaction = Transaction(
        id=f"TXN-{secrets.token_hex(5).upper()}",
        idempotency_key=body.idempotency_key,
        sender_account=customer.account_number,
        receiver_account=recipient.account_number if recipient else body.recipient_id,
        sender=customer.name,
        receiver=recipient.name if recipient else body.recipient_id,
        amount=body.amount_paise / 100,
        timestamp=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        status=status,
        route="UPI",
        failure_reason=reason,
        description=body.description,
    )
    if status == "SUCCESS":
        customer.balance -= transaction.amount
        recipient.balance += transaction.amount
    db.add(transaction)
    db.commit()
    db.refresh(transaction)
    return {**_public(transaction), "duplicate": False}


@router.get("/payments/{key}")
def payment_status(
    key: str,
    authorization: str | None = Header(None),
    db: Session = Depends(get_db),
):
    customer = _require_customer(authorization, db)
    transaction = db.query(Transaction).filter(
        Transaction.idempotency_key == key,
        Transaction.sender_account == customer.account_number,
    ).first()
    return {"found": bool(transaction), **(_public(transaction) if transaction else {})}
