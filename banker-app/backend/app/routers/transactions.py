"""
Transactions router.

Handles listing and searching payment transactions.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.schemas import TransactionResponse
from app.services import get_all_transactions, get_transaction_by_id

router = APIRouter()


@router.get("/", response_model=list[TransactionResponse])
async def list_transactions(
    status: str = Query(None),
    search: str = Query(None),
    date: str = Query(None, min_length=10, max_length=10),
    db: Session = Depends(get_db),
):
    """Return all transactions, optionally filtered by status or search query."""
    return get_all_transactions(db, status=status, search=search, date=date)


@router.get("/{transaction_id}", response_model=TransactionResponse)
async def get_transaction(transaction_id: str, db: Session = Depends(get_db)):
    """Return a single transaction by ID."""
    transaction = get_transaction_by_id(db, transaction_id)
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return transaction
