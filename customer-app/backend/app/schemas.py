from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, Field, field_validator


class LoginRequest(BaseModel):
    customer_id: str = Field(min_length=1, max_length=64)
    password: str = Field(min_length=1, max_length=128, repr=False)


class LoginResponse(BaseModel):
    access_token: str = Field(repr=False)
    token_type: str = "bearer"
    is_mock: bool = False


class Profile(BaseModel):
    customer_id: str
    name: str
    masked_account_number: str
    is_mock: bool = False


class AccountOut(Profile):
    balance: float


class TransactionOut(BaseModel):
    transaction_id: str
    direction: str  # DEBIT or CREDIT, from this customer's point of view
    counterparty_id: str
    amount: float
    description: str
    status: str
    created_at: str


class PaymentRequest(BaseModel):
    idempotency_key: str = Field(pattern=r"^[A-Za-z0-9_-]{16,64}$")
    recipient_id: str = Field(pattern=r"^[A-Za-z0-9_-]{3,32}$")
    amount: Decimal = Field(gt=0, le=100000, max_digits=9, decimal_places=2)
    description: str = Field(default="", max_length=100)

    @field_validator("description")
    @classmethod
    def _strip(cls, v: str) -> str:
        return v.strip()


class PaymentOut(BaseModel):
    idempotency_key: str
    recipient_id: str
    amount: float
    description: str
    status: str  # SUCCESS | FAILED | PROCESSING | UNKNOWN
    transaction_id: Optional[str] = None
    message_code: str
    message: str
    duplicate_detected: bool = False
    created_at: str
    updated_at: str
    is_mock: bool = False