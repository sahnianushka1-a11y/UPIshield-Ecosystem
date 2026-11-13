"""
Customers router.

Handles CRUD operations for bank customers.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.schemas import CustomerCreate, CustomerUpdate, CustomerResponse
from app.services import (
    get_all_customers, get_customer_by_id, create_customer,
    update_customer_status, add_activity_event,
)

router = APIRouter()


@router.get("/", response_model=list[CustomerResponse])
async def list_customers(
    search: str | None = Query(None),
    status: str | None = Query(None),
    db: Session = Depends(get_db),
):
    """Return all customers."""
    customers = get_all_customers(db)
    if search:
        query = search.lower()
        customers = [
            customer for customer in customers
            if query in customer.name.lower()
            or query in customer.email.lower()
            or query in customer.phone.lower()
            or query in customer.account_number.lower()
        ]
    if status:
        customers = [customer for customer in customers if customer.status == status]
    return customers


@router.get("/{customer_id}", response_model=CustomerResponse)
async def get_customer(customer_id: str, db: Session = Depends(get_db)):
    """Return a single customer by ID."""
    customer = get_customer_by_id(db, customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return customer


@router.post("/", response_model=CustomerResponse, status_code=201)
async def create_new_customer(data: CustomerCreate, db: Session = Depends(get_db)):
    """Create a new customer and return the created record."""
    customer = create_customer(db, data.name, data.email, data.phone, data.initial_deposit)
    add_activity_event(db, "customer_created", f"New customer {customer.name} registered")
    return customer


@router.patch("/{customer_id}", response_model=CustomerResponse)
async def update_customer(customer_id: str, data: CustomerUpdate, db: Session = Depends(get_db)):
    """Update a customer's status (ACTIVE / INACTIVE)."""
    customer = update_customer_status(db, customer_id, data.status)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return customer
