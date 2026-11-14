"""Apply Banker integration events to the in-memory UPIShield graph."""

from __future__ import annotations

import logging
from typing import Any

from dependencies import bank_graph, build_graph, get_affected_services, update_service_health

from .service_mapping import get_mapped_service, normalize_service
from .sync_state import (
    add_active_failure,
    add_skipped_event,
    mark_processed,
    record_event,
    remove_active_failure,
)

logger = logging.getLogger(__name__)


def restore_graph_state(state: dict[str, Any]) -> None:
    """Rebuild health from active event identities, preserving unrelated failures."""
    build_graph()
    failed_services = set()
    for failure in state.get("active_failures", {}).values():
        service_id = failure["graph_service"]
        failed_services.add(service_id)
        update_service_health(service_id, "FAILED")

    at_risk_services = set()
    for service_id in failed_services:
        at_risk_services.update(get_affected_services(service_id))

    for service_id in at_risk_services - failed_services:
        update_service_health(service_id, "AT_RISK")


def get_active_failures(state: dict[str, Any]) -> list[dict[str, Any]]:
    return list(state.get("active_failures", {}).values())


def process_banker_event(event: dict[str, Any], state: dict[str, Any]) -> dict[str, Any]:
    """Process one event, returning processed/skipped status.

    The caller persists the cursor only after this function returns successfully.
    """
    event_id = event.get("event_id")
    if not event_id:
        raise ValueError("Banker event is missing event_id")
    if event_id in state.setdefault("processed_event_ids", []):
        return {"status": "already_processed", "event_id": event_id}

    source = event.get("source")
    if source != "BANKER_SIMULATOR":
        reason = f"Unsupported event source: {source or 'missing'}"
        logger.warning("Skipping Banker integration event %s: %s", event_id, reason)
        add_skipped_event(state, event_id, reason)
        mark_processed(state, event_id)
        record_event(state, event, "SKIPPED", reason)
        return {"status": "skipped", "event_id": event_id, "reason": reason}

    event_type = event.get("event_type")
    if event_type not in {"API_FAILURE", "API_RECOVERY"}:
        reason = f"Unsupported event type: {event_type or 'missing'}"
        logger.warning("Skipping Banker integration event %s: %s", event_id, reason)
        add_skipped_event(state, event_id, reason)
        mark_processed(state, event_id)
        record_event(state, event, "SKIPPED", reason)
        return {"status": "skipped", "event_id": event_id, "reason": reason}

    banker_service = normalize_service(event.get("service", ""))
    graph_service = get_mapped_service(banker_service)
    if graph_service is None:
        reason = f"No UPIShield graph mapping for Banker service {banker_service or 'missing'}"
        logger.warning("Skipping unmapped Banker event %s: %s", event_id, reason)
        add_skipped_event(state, event_id, reason)
        mark_processed(state, event_id)
        record_event(state, event, "SKIPPED", reason)
        return {"status": "skipped", "event_id": event_id, "reason": reason}

    if event_type == "API_FAILURE":
        add_active_failure(
            state,
            event_id,
            banker_service,
            event.get("status", "FAILED"),
            event.get("failure_type") or "UNKNOWN",
            event_type,
        )
        state["active_failures"][event_id]["graph_service"] = graph_service
        state["active_failures"][event_id]["source"] = "BANKER_APP"
        state["active_failures"][event_id]["event_source"] = source
    else:
        related_event_id = event.get("related_event_id")
        candidates = [
            failure_id
            for failure_id, failure in state.get("active_failures", {}).items()
            if failure.get("service") == banker_service
        ]
        if related_event_id not in state.get("active_failures", {}):
            if related_event_id is None and len(candidates) == 1:
                related_event_id = candidates[0]
            elif related_event_id not in state.get("active_failures", {}) and not candidates:
                logger.info(
                    "Recovery event %s was already reflected by Banker state",
                    event_id,
                )
            else:
                raise ValueError(
                    f"Recovery event {event_id} does not identify an active failure"
                )
        if related_event_id:
            remove_active_failure(state, related_event_id)

    mark_processed(state, event_id)
    restore_graph_state(state)
    record_event(state, event, "PROCESSED")
    return {"status": "processed", "event_id": event_id, "event_type": event_type}
