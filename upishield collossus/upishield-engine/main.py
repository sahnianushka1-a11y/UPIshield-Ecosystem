
import os
import threading
from datetime import datetime, timezone
from uuid import uuid4

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from safety import evaluate_transaction_safety

# Module 1: Dependency Graph
from dependencies import (
    bank_graph,
    build_graph,
    update_service_health,
    get_affected_services,
    get_graph_data
)

# Module 3: Cascade Analysis
from cascade import analyze_active_failures, analyze_cascade

# Module 4: Recovery Advisor
from recovery import get_recovery_recommendation
from integration.event_processor import (
    get_active_failures,
    process_banker_event,
    restore_graph_state,
)
from integration.service_mapping import normalize_service
from integration.sync_state import load_sync_state, record_event, save_sync_state, update_cursor


# --------------------------------------------------
# APPLICATION INITIALIZATION
# --------------------------------------------------

app = FastAPI(
    title="UPIShield Intelligence Engine",
    description=(
        "Bank infrastructure dependency monitoring, "
        "failure detection, cascade analysis and recovery advisory"
    ),
    version="3.0.0"
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"]
)

BANKER_EVENTS_URL = os.getenv("BANKER_EVENTS_URL", "http://localhost:8001/events/after")
BANKER_FAILURE_STATUS_URL = os.getenv(
    "BANKER_FAILURE_STATUS_URL",
    "http://localhost:8001/failures/status",
)
BANKER_POLL_INTERVAL_SECONDS = max(
    2.0,
    float(os.getenv("BANKER_POLL_INTERVAL_SECONDS", "3")),
)
_integration_lock = threading.Lock()
_polling_stop = threading.Event()
_polling_thread = None
_sync_state = load_sync_state()
_local_failures = {}


class IntegrationUnavailable(Exception):
    """Raised when the Banker event API cannot be reached."""


def _event_cursor(state):
    return state.get("last_processed_timestamp"), state.get("last_processed_event_id")


def _fetch_event_page(timestamp=None, event_id=None):
    params = {"limit": 500}
    if timestamp and event_id:
        params.update({
            "cursor_timestamp": timestamp,
            "cursor_event_id": event_id,
        })
    try:
        with httpx.Client(timeout=5.0) as client:
            response = client.get(BANKER_EVENTS_URL, params=params)
            response.raise_for_status()
            return response.json()
    except (httpx.HTTPError, ValueError) as exc:
        raise IntegrationUnavailable(f"Unable to retrieve Banker events: {exc}") from exc


def _fetch_banker_active_failures():
    try:
        with httpx.Client(timeout=5.0) as client:
            response = client.get(BANKER_FAILURE_STATUS_URL)
            response.raise_for_status()
            payload = response.json()
    except (httpx.HTTPError, ValueError) as exc:
        raise IntegrationUnavailable(
            f"Unable to retrieve Banker failure status: {exc}"
        ) from exc

    active_failures = payload.get("active_failures")
    if not isinstance(active_failures, list):
        raise IntegrationUnavailable(
            "Banker failure status response has no active_failures list"
        )
    return active_failures


def _reconcile_banker_failures(state, banker_failures):
    """Keep persisted Banker failures limited to services currently active in Banker."""
    active_services = {
        normalize_service(failure.get("service_id", "").replace("-", "_"))
        for failure in banker_failures
        if failure.get("service_id")
    }
    stale_event_ids = [
        event_id
        for event_id, failure in state.get("active_failures", {}).items()
        if normalize_service(failure.get("service", "")) not in active_services
    ]
    for event_id in stale_event_ids:
        state["active_failures"].pop(event_id, None)
    return stale_event_ids


def _sync_events(replay=False):
    global _sync_state
    state = load_sync_state() if not replay else {
        "last_processed_event_id": None,
        "last_processed_timestamp": None,
        "last_sync_at": None,
        "processed_event_ids": [],
        "event_log": [],
        "active_failures": {},
        "skipped_events": [],
        "last_error": None,
    }
    if replay:
        build_graph()

    fetched = processed = skipped = failed = 0
    timestamp, event_id = _event_cursor(state)
    while True:
        events = _fetch_event_page(timestamp, event_id)
        fetched += len(events)
        if not events:
            break
        for event in events:
            try:
                result = process_banker_event(event, state)
            except (ValueError, KeyError) as exc:
                failed += 1
                state["last_error"] = str(exc)
                record_event(state, event, "FAILED", str(exc))
                save_sync_state(state)
                _sync_state = state
                _restore_combined_graph(state)
                return {
                    "fetched": fetched,
                    "processed": processed,
                    "skipped": skipped,
                    "failed": failed,
                    "cursor": _event_cursor(state),
                }

            if result["status"] == "processed":
                processed += 1
            elif result["status"] == "skipped":
                skipped += 1
            timestamp = event["timestamp"]
            event_id = event["event_id"]
            update_cursor(state, event_id, timestamp)
            banker_failures = _fetch_banker_active_failures()
            reconciled_event_ids = _reconcile_banker_failures(state, banker_failures)
            if reconciled_event_ids:
                record_event(
                    state,
                    {
                        "event_id": ",".join(reconciled_event_ids),
                        "event_type": "BANKER_STATE_RECONCILIATION",
                        "service": "BANKER",
                        "source": "BANKER_STATUS",
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                    },
                    "PROCESSED",
                    "Removed failures no longer active in Banker",
                )
            state["last_error"] = None
            save_sync_state(state)
        if len(events) < 500:
            break

    state["last_error"] = None
    state["last_sync_at"] = datetime.now(timezone.utc).isoformat()
    save_sync_state(state)
    _sync_state = state
    _restore_combined_graph(state)
    return {
        "fetched": fetched,
        "processed": processed,
        "skipped": skipped,
        "failed": failed,
        "cursor": _event_cursor(state),
    }


def _restore_combined_graph(state):
    """Compose the authoritative Banker graph with optional local test failures."""
    restore_graph_state(state)
    for failure in _local_failures.values():
        service_id = failure["service_id"]
        update_service_health(service_id, "FAILED")
        for affected_id in get_affected_services(service_id):
            if bank_graph.nodes[affected_id].get("health") != "FAILED":
                update_service_health(affected_id, "AT_RISK")


def _active_failure_records():
    state = load_sync_state()
    banker_failures = []
    for event_id, failure in state.get("active_failures", {}).items():
        banker_failures.append({
            **failure,
            "event_id": event_id,
            "source": "BANKER_APP",
        })
    local_failures = [
        {**failure, "failure_id": failure_id}
        for failure_id, failure in _local_failures.items()
    ]
    return banker_failures + local_failures


def _analysis_for_service(service_id):
    failures = [
        failure for failure in _active_failure_records()
        if failure.get("graph_service", failure.get("service_id")) == service_id
    ]
    cascade_result = analyze_cascade(service_id, _active_failure_records())
    cascade_result["current_state_impact"] = analyze_active_failures(
        _active_failure_records()
    )
    recovery_result = get_recovery_recommendation(service_id)
    recovery_result["failure_source"] = sorted({
        failure.get("source", "UNKNOWN") for failure in failures
    }) or ["UNKNOWN"]
    recovery_result["active_failure_ids"] = [
        failure.get("event_id") or failure.get("failure_id")
        for failure in failures
    ]
    recovery_result["active_failures"] = failures
    recovery_result["affected_services"] = cascade_result.get("affected_services", [])
    return cascade_result, recovery_result


def _record_sync_error(message):
    state = load_sync_state()
    state["last_error"] = message
    try:
        save_sync_state(state)
    except RuntimeError:
        pass


def _poll_once():
    if not _integration_lock.acquire(blocking=False):
        return
    try:
        _sync_events()
    except IntegrationUnavailable as exc:
        _record_sync_error(str(exc))
    finally:
        _integration_lock.release()


def _background_poll_loop():
    while not _polling_stop.wait(BANKER_POLL_INTERVAL_SECONDS):
        _poll_once()


def _start_background_poller():
    global _polling_thread
    if _polling_thread and _polling_thread.is_alive():
        return
    _polling_stop.clear()
    _polling_thread = threading.Thread(
        target=_background_poll_loop,
        name="banker-event-poller",
        daemon=True,
    )
    _polling_thread.start()


@app.on_event("startup")
def replay_banker_events_on_startup():
    """Restore graph state without making startup dependent on Banker availability."""
    global _sync_state
    try:
        _sync_events(replay=True)
    except IntegrationUnavailable as exc:
        _sync_state = load_sync_state()
        _sync_state["last_error"] = str(exc)
        try:
            save_sync_state(_sync_state)
        except RuntimeError:
            pass
    _start_background_poller()


@app.on_event("shutdown")
def stop_background_poller():
    _polling_stop.set()
    if _polling_thread and _polling_thread.is_alive():
        _polling_thread.join(timeout=2)


# --------------------------------------------------
# REQUEST MODELS
# --------------------------------------------------

class FailureEvent(BaseModel):
    service_id: str
    failure_type: str
    severity: str = "HIGH"

class TransactionSafetyEvent(BaseModel):
    transaction_id: str
    payment_status: str = "UNKNOWN"
    response_received: bool = True
    duplicate_detected: bool = False
    provider_status: str | None = None

class RecoveryRequest(BaseModel):
    service_id: str


# --------------------------------------------------
# HOME AND HEALTH ENDPOINTS
# --------------------------------------------------

@app.get("/")
def home():
    return {
        "project": "UPIShield AI",
        "message": "UPIShield Intelligence Engine is running",
        "status": "ONLINE",
        "modules": [
            "Dependency Graph",
            "Failure Detection",
            "Cascade Analysis",
            "Recovery Advisor"
        ]
    }


@app.get("/health")
def health():
    return {
        "status": "ONLINE",
        "total_services": bank_graph.number_of_nodes(),
        "total_dependencies": bank_graph.number_of_edges()
    }


@app.get("/integration/status")
def integration_status():
    state = load_sync_state()
    last_error = state.get("last_error")
    last_sync = state.get("last_sync_at")
    stale = True
    if last_sync:
        try:
            stale = (
                datetime.now(timezone.utc) - datetime.fromisoformat(last_sync)
            ).total_seconds() > BANKER_POLL_INTERVAL_SECONDS * 3
        except ValueError:
            stale = True
    return {
        "banker_connection": "OFFLINE" if last_error else (
            "ONLINE" if state.get("last_processed_event_id") else "NOT_SYNCED"
        ),
        "polling_enabled": bool(_polling_thread and _polling_thread.is_alive()),
        "poll_interval_seconds": BANKER_POLL_INTERVAL_SECONDS,
        "stale": stale or bool(last_error),
        "last_successful_sync": state.get("last_sync_at"),
        "last_processed_event_cursor": {
            "timestamp": state.get("last_processed_timestamp"),
            "event_id": state.get("last_processed_event_id"),
        },
        "processed_events": len(state.get("processed_event_ids", [])),
        "skipped_events": len(state.get("skipped_events", [])),
        "active_banker_failures": len(get_active_failures(state)),
        "local_simulation_failures": len(_local_failures),
        "active_failures": _active_failure_records(),
        "recent_sync_error": last_error,
        "recent_events": state.get("event_log", [])[-50:][::-1],
        "recent_banker_recoveries": [
            event for event in state.get("event_log", [])
            if event.get("source") == "BANKER_SIMULATOR"
            and event.get("event_type") == "API_RECOVERY"
        ][-10:][::-1],
    }


@app.post("/integration/poll")
def poll_banker_events():
    if not _integration_lock.acquire(blocking=False):
        raise HTTPException(status_code=409, detail="Another integration operation is running")
    try:
        return _sync_events()
    except IntegrationUnavailable as exc:
        state = load_sync_state()
        state["last_error"] = str(exc)
        try:
            save_sync_state(state)
        except RuntimeError:
            pass
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    finally:
        _integration_lock.release()


@app.post("/integration/replay")
def replay_banker_events():
    if not _integration_lock.acquire(blocking=False):
        raise HTTPException(status_code=409, detail="Another integration operation is running")
    try:
        result = _sync_events(replay=True)
        return {"status": "completed", **result}
    except IntegrationUnavailable as exc:
        state = load_sync_state()
        state["last_error"] = str(exc)
        save_sync_state(state)
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    finally:
        _integration_lock.release()


# --------------------------------------------------
# MODULE 1: DEPENDENCY GRAPH
# --------------------------------------------------

@app.get("/graph")
def graph():
    return get_graph_data()


@app.get("/services")
def get_services():
    services = []

    for service_id, data in bank_graph.nodes(data=True):
        services.append({
            "service_id": service_id,
            "name": data.get("name"),
            "type": data.get("type"),
            "owner": data.get("owner"),
            "region": data.get("region"),
            "criticality": data.get("criticality"),
            "health": data.get("health")
        })

    return {
        "total_services": len(services),
        "services": services
    }


# --------------------------------------------------
# MODULE 2: FAILURE DETECTION
# MODULE 3: CASCADE ANALYSIS
# MODULE 4: RECOVERY ADVISOR
# --------------------------------------------------

@app.post("/events/failure")
def receive_failure(event: FailureEvent):

    service_id = event.service_id

    # STEP 1: Validate service
    if service_id not in bank_graph:
        raise HTTPException(
            status_code=404,
            detail=f"Unknown service: {service_id}"
        )

    # This endpoint is intentionally local-only. Banker events are consumed
    # through /integration/poll and remain the authoritative infrastructure state.
    failure_id = f"local-{uuid4().hex}"
    _local_failures[failure_id] = {
        "service_id": service_id,
        "failure_type": event.failure_type,
        "severity": event.severity,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "source": "LOCAL_SIMULATION",
    }
    _restore_combined_graph(load_sync_state())

    # STEP 2: Mark injected service as FAILED
    failure_result = update_service_health(
        service_id,
        "FAILED"
    )

    if not failure_result["success"]:
        raise HTTPException(
            status_code=400,
            detail=failure_result["message"]
        )

    # STEP 3: Identify dependent services
    affected_services = get_affected_services(service_id)

    # STEP 4: Mark dependent services AT_RISK
    for affected_id in affected_services:
        update_service_health(
            affected_id,
            "AT_RISK"
        )

    # STEP 5: Run Module 3 - Cascade Analysis
    cascade_result, recovery_result = _analysis_for_service(service_id)

    # STEP 7: Return complete incident analysis
    return {
        "success": True,

        "event": "FAILURE_DETECTED",

        "failure": {
            "event_id": failure_id,
            "service_id": service_id,
            "service_name": bank_graph.nodes[service_id]["name"],
            "failure_type": event.failure_type,
            "severity": event.severity,
            "status": "FAILED",
            "source": "LOCAL_SIMULATION"
        },

        "impact": {
            "affected_count": len(affected_services),
            "affected_service_ids": affected_services
        },

        "cascade_analysis": cascade_result,

        "recovery_advisor": recovery_result,

        "graph": get_graph_data()
    }


# --------------------------------------------------
# MODULE 3: CASCADE ANALYSIS API
# --------------------------------------------------

@app.get("/cascade/{service_id}")
def get_cascade_analysis(service_id: str):

    if service_id not in bank_graph:
        raise HTTPException(
            status_code=404,
            detail=f"Unknown service: {service_id}"
        )

    result, _ = _analysis_for_service(service_id)

    return result


@app.get("/impact")
def get_active_impact():
    """Return de-duplicated impact for all current Banker and local failures."""
    return analyze_active_failures(_active_failure_records())


# --------------------------------------------------
# MODULE 4: RECOVERY ADVISOR API
# --------------------------------------------------

@app.get("/recovery/{service_id}")
def get_recovery_analysis(service_id: str):

    if service_id not in bank_graph:
        raise HTTPException(
            status_code=404,
            detail=f"Unknown service: {service_id}"
        )

    _, result = _analysis_for_service(service_id)
    return result


@app.post("/recovery")
def request_recovery(request: RecoveryRequest):

    service_id = request.service_id

    if service_id not in bank_graph:
        raise HTTPException(
            status_code=404,
            detail=f"Unknown service: {service_id}"
        )

    _, result = _analysis_for_service(service_id)
    return result


# --------------------------------------------------
# RESET SIMULATION
# --------------------------------------------------

@app.post("/reset")
def reset_simulation():
    _local_failures.clear()
    _restore_combined_graph(load_sync_state())

    return {
        "success": True,
        "message": "Simulation reset successfully",
        "status": "LOCAL_SIMULATION_RESET",
        "graph": get_graph_data()
    }


# --------------------------------------------------
# SERVICE STATUS
# --------------------------------------------------

@app.get("/service/{service_id}")
def get_service_status(service_id: str):

    if service_id not in bank_graph:
        raise HTTPException(
            status_code=404,
            detail=f"Unknown service: {service_id}"
        )

    data = bank_graph.nodes[service_id]

    return {
        "service_id": service_id,
        "name": data["name"],
        "type": data["type"],
        "criticality": data["criticality"],
        "health": data.get("health", "UNKNOWN")
    }
# ==========================================
# MODULE 5: TRANSACTION SAFETY API
# ==========================================

@app.post("/api/safety/evaluate")
def transaction_safety(event: TransactionSafetyEvent):

    result = evaluate_transaction_safety(
        transaction_id=event.transaction_id,
        payment_status=event.payment_status,
        response_received=event.response_received,
        duplicate_detected=event.duplicate_detected,
        provider_status=event.provider_status
    )

    if not result["success"]:
        raise HTTPException(
            status_code=400,
            detail=result["reason"]
        )

    return {
        "module": "TRANSACTION_SAFETY",
        "evaluation": result
    }