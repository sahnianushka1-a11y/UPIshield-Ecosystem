from fastapi import APIRouter, Depends

from app.deps import get_token
from app.schemas import LoginRequest, LoginResponse, Profile
from app.services.bank_client import bank

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=LoginResponse)
async def login(body: LoginRequest):
    return await bank.login(body.customer_id, body.password)


@router.get("/me", response_model=Profile)
async def me(token: str = Depends(get_token)):
    return await bank.get_profile(token)