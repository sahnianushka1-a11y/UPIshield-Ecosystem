"""Persisted integration events prepared for future UPIShield delivery."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from datetime import datetime
from app.database import get_db
from app.models import IntegrationEvent
from app.schemas.schemas import IntegrationEventResponse

router = APIRouter()


@router.get("/", response_model=list[IntegrationEventResponse])
async def list_events(db: Session = Depends(get_db)):
    """Return the 100 most recent integration events (newest first)."""
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
            related_event_id=event.related_event_id,
        )
        for event in events
    ]


@router.get("/after", response_model=list[IntegrationEventResponse])
async def list_events_after(
    cursor_timestamp: str | None = Query(None, description="Timestamp component of the composite cursor"),
    cursor_event_id: str | None = Query(None, description="Event ID component of the composite cursor"),
    after_timestamp: str | None = Query(None, include_in_schema=False),
    after_event_id: str | None = Query(None, include_in_schema=False),
    limit: int = Query(100, ge=1, le=500, description="Maximum number of events to return"),
    db: Session = Depends(get_db),
):
    """Cursor-based event retrieval using composite (timestamp, event_id) cursor.
    
    This endpoint is designed for UPIShield polling. It returns events that are
    chronologically newer than the provided cursor. When both after_timestamp and
    after_event_id are provided, it uses a composite comparison to handle events
    that share the same timestamp.
    
    The events are returned in chronological order (oldest first) so the consumer
    can process them sequentially.
    """
    query = db.query(IntegrationEvent).order_by(
        IntegrationEvent.timestamp.asc(),
        IntegrationEvent.id.asc()
    )
    
    # Apply composite cursor filter
    timestamp_value = cursor_timestamp or after_timestamp
    event_id_value = cursor_event_id or after_event_id
    if bool(timestamp_value) != bool(event_id_value):
        raise HTTPException(
            status_code=422,
            detail="cursor_timestamp and cursor_event_id must be provided together",
        )

    if timestamp_value and event_id_value:
        try:
            parsed_timestamp = datetime.fromisoformat(timestamp_value)
        except ValueError as exc:
            raise HTTPException(status_code=422, detail="Invalid cursor_timestamp") from exc
        # Events where:
        #   timestamp > cursor_timestamp, OR
        #   timestamp == cursor_timestamp AND id > cursor_event_id
        query = query.filter(
            or_(
                IntegrationEvent.timestamp > parsed_timestamp,
                and_(
                    IntegrationEvent.timestamp == parsed_timestamp,
                    IntegrationEvent.id > event_id_value
                )
            )
        )
    
    events = query.limit(limit).all()
    
    return [
        IntegrationEventResponse(
            event_type=event.event_type,
            event_id=event.id,
            service=event.service,
            status=event.status,
            failure_type=event.failure_type,
            timestamp=event.timestamp.isoformat(),
            source=event.source,
            related_event_id=event.related_event_id,
        )
        for event in events
    ]
