"""Persistent synchronization state management.

This module handles:
- Loading and saving the last processed event cursor
- Tracking active failures by event ID
- Recording skipped events (unmapped services)
- Atomic file writes to prevent corruption

The sync state is stored in sync_state.json in the same directory as this module.
All writes use atomic replace to prevent corruption from interrupted writes.
"""

import json
import os
import tempfile
import time
from datetime import datetime, timezone
from typing import Any


# Path to sync state file (same directory as this module)
_SYNC_STATE_PATH = os.path.join(os.path.dirname(__file__), "sync_state.json")


def _default_state() -> dict[str, Any]:
    """Return the default sync state structure."""
    return {
        "last_processed_event_id": None,
        "last_processed_timestamp": None,
        "last_sync_at": datetime.now(timezone.utc).isoformat(),
        "processed_event_ids": [],
        "event_log": [],
        "active_failures": {},  # event_id -> {service, status, failure_type, event_type}
        "skipped_events": [],  # list of {event_id, reason}
        "last_error": None,
    }


def load_sync_state() -> dict[str, Any]:
    """Load the sync state from disk.
    
    Returns the current sync state if the file exists, otherwise returns
    the default empty state.
    
    Returns:
        Dictionary containing sync state data
    """
    if not os.path.exists(_SYNC_STATE_PATH):
        return _default_state()
    
    try:
        with open(_SYNC_STATE_PATH, "r") as f:
            state = json.load(f)
        
        # Validate required keys
        required_keys = [
            "last_processed_event_id",
            "last_processed_timestamp",
            "last_sync_at",
            "active_failures",
            "skipped_events",
            "processed_event_ids",
            "event_log",
            "last_error",
        ]
        for key in required_keys:
            if key not in state:
                state[key] = _default_state()[key]
        
        return state
    except (json.JSONDecodeError, IOError):
        # If file is corrupted, return default state
        return _default_state()


def save_sync_state(state: dict[str, Any]) -> bool:
    """Atomically save the sync state to disk.
    
    Uses write-to-temp-then-rename pattern to prevent corruption from
    interrupted writes.
    
    Args:
        state: Dictionary containing sync state data
        
    Returns:
        True if save was successful, False otherwise
    """
    dir_name = os.path.dirname(_SYNC_STATE_PATH)
    tmp_fd = None
    tmp_path = None
    
    try:
        # Create temporary file in the same directory (for atomic rename).
        tmp_fd, tmp_path = tempfile.mkstemp(dir=dir_name, suffix=".tmp")
        with os.fdopen(tmp_fd, "w") as f:
            tmp_fd = None
            json.dump(state, f, indent=2, default=str)

        # OneDrive can briefly hold the destination while syncing on Windows.
        for attempt in range(3):
            try:
                os.replace(tmp_path, _SYNC_STATE_PATH)
                tmp_path = None
                return True
            except PermissionError:
                if attempt == 2:
                    raise
                time.sleep(0.1 * (attempt + 1))
    except (OSError, TypeError) as exc:
        if tmp_fd is not None:
            os.close(tmp_fd)
        if tmp_path is not None and os.path.exists(tmp_path):
            os.unlink(tmp_path)
        raise RuntimeError(f"Unable to persist UPIShield sync state: {exc}") from exc


def clear_sync_state() -> bool:
    """Clear the sync state file (for testing/reset purposes).
    
    Returns:
        True if cleared successfully, False otherwise
    """
    try:
        if os.path.exists(_SYNC_STATE_PATH):
            os.unlink(_SYNC_STATE_PATH)
        return True
    except Exception as e:
        print(f"[SYNC] Error clearing sync state: {e}")
        return False


def update_cursor(state: dict, event_id: str, timestamp: str) -> dict:
    """Update the sync cursor to point past the given event."""
    state["last_processed_event_id"] = event_id
    state["last_processed_timestamp"] = timestamp
    state["last_sync_at"] = datetime.now(timezone.utc).isoformat()
    return state


def add_active_failure(state: dict, event_id: str, service: str, 
                       status: str, failure_type: str, event_type: str) -> dict:
    """Record an active failure in the sync state."""
    state["active_failures"][event_id] = {
        "service": service,
        "status": status,
        "failure_type": failure_type,
        "event_type": event_type,
        "recorded_at": datetime.now(timezone.utc).isoformat(),
    }
    return state


def remove_active_failure(state: dict, event_id: str) -> dict:
    """Remove a failure from the active failures list."""
    state["active_failures"].pop(event_id, None)
    return state


def get_active_failures_for_service(state: dict, service: str) -> list:
    """Get all active event IDs for a specific service."""
    return [
        eid for eid, failure in state["active_failures"].items()
        if failure.get("service") == service and failure.get("event_type") == "API_FAILURE"
    ]


def add_skipped_event(state: dict, event_id: str, reason: str) -> dict:
    """Record a skipped event (e.g., unmapped service)."""
    state["skipped_events"].append({
        "event_id": event_id,
        "reason": reason,
        "skipped_at": datetime.now(timezone.utc).isoformat(),
    })
    if len(state["skipped_events"]) > 1000:
        state["skipped_events"] = state["skipped_events"][-1000:]
    return state


def mark_processed(state: dict, event_id: str) -> dict:
    """Record an event ID once so replays and polls are idempotent."""
    processed = state.setdefault("processed_event_ids", [])
    if event_id not in processed:
        processed.append(event_id)
    if len(processed) > 5000:
        state["processed_event_ids"] = processed[-5000:]
    return state


def record_event(state: dict, event: dict, result: str, reason: str | None = None) -> dict:
    """Keep a bounded local audit trail for the UPIShield dashboard."""
    state.setdefault("event_log", []).append({
        "event_id": event.get("event_id"),
        "event_type": event.get("event_type"),
        "service": event.get("service"),
        "source": event.get("source"),
        "timestamp": event.get("timestamp"),
        "result": result,
        "reason": reason,
    })
    state["event_log"] = state["event_log"][-5000:]
    return state

