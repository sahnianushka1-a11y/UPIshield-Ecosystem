"""UPIShield integration module for Banker event processing.

This module handles:
- Service ID mapping between Banker and UPIShield graph
- Event validation and processing
- Persistent synchronization state management
- Graph state restoration on startup
"""

from .service_mapping import SERVICE_MAPPING, normalize_service
from .event_processor import get_active_failures, process_banker_event, restore_graph_state
from .sync_state import load_sync_state, save_sync_state, clear_sync_state

__all__ = [
    "SERVICE_MAPPING",
    "normalize_service",
    "process_banker_event",
    "get_active_failures",
    "restore_graph_state",
    "load_sync_state",
    "save_sync_state",
    "clear_sync_state",
]
