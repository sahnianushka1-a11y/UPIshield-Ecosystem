"""Persisted integration events prepared for future UPIShield delivery."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import IntegrationEvent
from app.schemas.schemas import IntegrationEventResponse

router = APIRouter()


@router.get("/", response_model=list[IntegrationEventResponse])
async def list_events(db: Session = Depends(get_db)):
    events = db.query(IntegrationEvent).order_by(IntegrationEvent.timestamp.desc()).limit(100).all()
    return [
        IntegrationEventResponse(
            event_type=event.event_type,
            event_id=event.id,
            service=event.service,
            status=event.status,
            failure_type=event.failure_type,
            timestamp=event.timestamp.isoformat(),
            source=event.source,
        )
        for event in events
    ]
