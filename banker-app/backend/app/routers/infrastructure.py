"""
Infrastructure router.

Returns the current health status of all banking services.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.schemas import InfraServiceResponse
from app.services import get_all_infrastructure

router = APIRouter()


@router.get("/", response_model=list[InfraServiceResponse])
async def get_infrastructure(db: Session = Depends(get_db)):
    """Return the health status of all infrastructure services."""
    return get_all_infrastructure(db)
