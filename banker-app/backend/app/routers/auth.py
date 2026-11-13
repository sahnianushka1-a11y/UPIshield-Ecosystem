"""
Authentication router.

Handles administrator login.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.schemas import LoginRequest, LoginResponse
from app.services import authenticate_user, seed_database

router = APIRouter()


@router.post("/login", response_model=LoginResponse)
async def login(request: LoginRequest, db: Session = Depends(get_db)):
    """Authenticate an administrator and return a token."""
    seed_database(db)  # Ensure sample data exists
    user = authenticate_user(db, request.email, request.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    # Simple token: in production use JWT
    token = f"banker_token_{user['email']}_{user['role']}"
    return LoginResponse(
        success=True,
        token=token,
        user={"id": user["id"], "name": "Bank Administrator", "email": user["email"], "role": user["role"]},
    )
