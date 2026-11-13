"""
Pydantic schemas for request and response validation.
"""

from datetime import datetime
from typing import Optional, List, Literal
from pydantic import BaseModel, Field, field_validator


# ---------- Auth ----------

class LoginRequest(BaseModel):
    email: str
    password: str


class LoginResponse(BaseModel):
    success: bool
    message: str = ""
    token: str = ""
    user: dict = {}


# ---------- Customer ----------

class CustomerCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: str = Field(min_length=3, max_length=255)
    phone: str = Field(min_length=8, max_length=30)
    initial_deposit: float = Field(ge=0)

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        if "@" not in value or "." not in value.rsplit("@", 1)[-1]:
            raise ValueError("Invalid email format")
        return value

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, value: str) -> str:
        digits = "".join(character for character in value if character.isdigit())
        if len(digits) < 8 or len(digits) > 15:
            raise ValueError("Invalid phone number")
        return value


class CustomerUpdate(BaseModel):
    status: Literal["ACTIVE", "INACTIVE"]


class CustomerResponse(BaseModel):
    id: str
    name: str
    email: str
    phone: str
    account_number: str
    balance: float
    status: str
    created_at: str

    model_config = {"from_attributes": True}


# ---------- Transaction ----------

class TransactionResponse(BaseModel):
    id: str
    sender_account: str
    receiver_account: str
    sender: str
    receiver: str
    amount: float
    timestamp: str
    status: str
    route: str
    failure_reason: Optional[str] = None

    model_config = {"from_attributes": True}


# ---------- Infrastructure ----------

class InfraServiceResponse(BaseModel):
    id: str
    name: str
    status: str
    latency: int
    availability: float
    last_update: datetime
    failure_info: Optional[str] = None

    model_config = {"from_attributes": True}


# ---------- Failure ----------

class FailureInject(BaseModel):
    service_id: str
    failure_type: Literal[
        "API_TIMEOUT", "API_UNAVAILABLE", "SERVER_ERROR",
        "NETWORK_INTERRUPTION", "RESPONSE_LOST",
        "API timeout", "API unavailable", "Server error",
        "Network interruption", "Response lost",
    ]


class FailureResponse(BaseModel):
    id: str
    service_id: str
    service_name: str
    failure_type: str
    status: str
    injected_at: datetime
    recovered_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class FailureStatusResponse(BaseModel):
    active_failures: List[FailureResponse]
    all_services: List[str]


class IntegrationEventResponse(BaseModel):
    event_type: str
    event_id: str
    service: str
    status: str
    failure_type: Optional[str] = None
    timestamp: str
    source: str


# ---------- Activity ----------

class ActivityEventResponse(BaseModel):
    id: str
    event_type: str
    message: str
    time: str

    model_config = {"from_attributes": True}


# ---------- Dashboard ----------

class DashboardSummary(BaseModel):
    total_customers: int
    total_transactions: int
    total_volume: str
    successful_transactions: int
    failed_transactions: int
    pending_transactions: int
    infrastructure_health: str
    active_alerts: int
    recent_activity: List[ActivityEventResponse]
