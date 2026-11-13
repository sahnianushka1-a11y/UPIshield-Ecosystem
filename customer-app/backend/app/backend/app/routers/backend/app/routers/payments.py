from typing import List

from fastapi import APIRouter, Depends

from app.deps import get_current_user
from app.schemas import PaymentOut, PaymentRequest
from app.services import payments

router = APIRouter(prefix="/api/payments", tags=["payments"])


@router.post("", response_model=PaymentOut)
async def create(body: PaymentRequest, user=Depends(get_current_user)):
    token, profile = user
    return await payments.create_payment(token, profile["customer_id"], body)


@router.get("", response_model=List[PaymentOut])
async def mine(user=Depends(get_current_user)):
    _, profile = user
    return payments.list_payments(profile["customer_id"])


@router.post("/{key}/refresh", response_model=PaymentOut)
async def refresh(key: str, user=Depends(get_current_user)):
    token, profile = user
    return await payments.refresh_status(token, profile["customer_id"], key)