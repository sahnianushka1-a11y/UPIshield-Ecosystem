"""
Failures router.

Handles simulated failure injection and recovery.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.schemas import FailureInject, FailureResponse, FailureStatusResponse
from app.services import (
    get_active_failures, get_all_failures, create_failure,
    recover_failure, get_all_infrastructure, update_infrastructure_service,
    add_activity_event,
    create_integration_event,
)

router = APIRouter()

# Service name lookup (mirrors frontend serviceLabels)
SERVICE_NAMES = {
    "payment-api": "Payment API",
    "auth-api": "Authentication API",
    "bank-db": "Bank Database",
    "upi-gateway": "UPI Gateway",
    "payment-processor": "Payment Processing Service",
    "external-payments": "External Payment Dependencies",
}

SERVICE_DEFAULTS = {
    "payment-api": (120, 99.9),
    "auth-api": (85, 99.95),
    "bank-db": (45, 100),
    "upi-gateway": (200, 99.8),
    "payment-processor": (200, 99.8),
    "external-payments": (340, 99.5),
}

FAILURE_STATUS_MAP = {
    "API_TIMEOUT": "DEGRADED",
    "API_UNAVAILABLE": "DOWN",
    "SERVER_ERROR": "DOWN",
    "NETWORK_INTERRUPTION": "DEGRADED",
    "RESPONSE_LOST": "DEGRADED",
    "API timeout": "DEGRADED",
    "API unavailable": "DOWN",
    "Server error": "DOWN",
    "Network interruption": "DEGRADED",
    "Response lost": "DEGRADED",
}


def _infra_status_from_failure(failure_type: str) -> str:
    """Map failure type to infrastructure status."""
    return FAILURE_STATUS_MAP.get(failure_type, "DOWN")


def _infra_latency_from_failure(failure_type: str) -> int:
    """Map failure type to simulated latency."""
    if failure_type in ("API_TIMEOUT", "NETWORK_INTERRUPTION", "API timeout", "Network interruption"):
        return 5000
    return 9999


@router.get("/status", response_model=FailureStatusResponse)
async def failure_status(db: Session = Depends(get_db)):
    """Return active failures and the list of all known services."""
    services = get_all_infrastructure(db)
    return FailureStatusResponse(
        active_failures=[FailureResponse.model_validate(f) for f in get_active_failures(db)],
        all_services=[s.id for s in services],
    )


@router.post("/inject", response_model=FailureResponse, status_code=201)
async def inject_failure(data: FailureInject, db: Session = Depends(get_db)):
    """Inject a simulated failure on the specified service."""
    service = next((item for item in get_all_infrastructure(db) if item.id == data.service_id), None)
    if not service:
        raise HTTPException(status_code=404, detail="Infrastructure service not found")
    if any(f.service_id == data.service_id for f in get_active_failures(db)):
        raise HTTPException(status_code=409, detail="Service already has an active simulated failure")

    service_name = SERVICE_NAMES.get(data.service_id, service.name)
    failure = create_failure(db, data.service_id, service_name, data.failure_type)

    # Update infrastructure service status
    infra_status = _infra_status_from_failure(data.failure_type)
    latency = _infra_latency_from_failure(data.failure_type)
    update_infrastructure_service(
        db, data.service_id,
        status=infra_status,
        latency=latency,
        availability=0 if infra_status == "DOWN" else 97.2,
        failure_info=f"Simulated failure: {data.failure_type}",
    )

    add_activity_event(db, "alert", f"Failure injected: {service_name} — {data.failure_type}")
    create_integration_event(
        db,
        "API_FAILURE",
        data.service_id.upper().replace("-", "_"),
        infra_status,
        data.failure_type,
    )
    return failure


@router.post("/{failure_id}/recover", response_model=FailureResponse)
async def recover_failure_endpoint(failure_id: str, db: Session = Depends(get_db)):
    """Recover a service from a simulated failure."""
    failure = recover_failure(db, failure_id)
    if not failure:
        raise HTTPException(status_code=404, detail="Failure not found")

    service_name = SERVICE_NAMES.get(failure.service_id, failure.service_id)

    # Restore infrastructure service to operational
    default_latency, default_availability = SERVICE_DEFAULTS.get(failure.service_id, (120, 99.9))
    update_infrastructure_service(
        db, failure.service_id,
        status="OPERATIONAL",
        latency=default_latency,
        availability=default_availability,
        failure_info=None,
    )

    add_activity_event(db, "alert", f"Service recovered: {service_name}")
    create_integration_event(
        db,
        "API_RECOVERY",
        failure.service_id.upper().replace("-", "_"),
        "OPERATIONAL",
        failure.failure_type,
    )
    return failure


@router.get("/", response_model=list[FailureResponse])
async def list_failures(db: Session = Depends(get_db)):
    """Return all failures (active and recovered)."""
    return get_all_failures(db)
