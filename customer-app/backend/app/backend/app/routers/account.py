from typing import List

from fastapi import APIRouter, Depends, Query

from app import config
from app.deps import get_current_user
from app.schemas import AccountOut, TransactionOut
from app.services.bank_client import bank

router = APIRouter(prefix="/api", tags=["account"])


@router.get("/account", response_model=AccountOut)
async def account(user=Depends(get_current_user)):
    token, profile = user
    bal = await bank.get_balance(token)  # always from the Bank, never from the client
    return {**profile, "balance": bal["balance"], "is_mock": config.USE_MOCK_BANK}


@router.get("/transactions", response_model=List[TransactionOut])
async def transactions(limit: int = Query(10, ge=1, le=100), user=Depends(get_current_user)):
    token, _ = user
    return await bank.list_transactions(token, limit)