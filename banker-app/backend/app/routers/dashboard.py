"""
Dashboard router.

Returns aggregated statistics for the overview dashboard.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.schemas import DashboardSummary
from app.services import get_dashboard_stats

router = APIRouter()


@router.get("/summary", response_model=DashboardSummary)
async def dashboard_summary(db: Session = Depends(get_db)):
    """Return aggregated dashboard metrics."""
    return DashboardSummary(**get_dashboard_stats(db))
