"""Centralized service ID mapping between Banker and UPIShield.

This module contains the authoritative mapping configuration that translates
Banker infrastructure service identifiers to UPIShield graph node identifiers.

MAPPING RATIONALE:
- PAYMENT_API → payment_gateway: Both are the primary payment routing/API layer
- BANK_DB → primary_db: Both are the primary database for transaction data
- UPI_GATEWAY → bank_switch: Both are routing/switching components for transactions

UNMAPPED SERVICES (intentional):
- AUTH_API: Admin authentication has no equivalent in UPIShield's payment ecosystem
- PAYMENT_PROCESSOR: General processor does not map to specific bank PSP nodes
- EXTERNAL_PAYMENTS: General external dependency has no direct graph equivalent

DO NOT modify this mapping without coordinating with both Banker and UPIShield teams.
"""


# Authoritative service ID mapping
# Banker sends: "PAYMENT_API", "BANK_DB", "UPI_GATEWAY", etc.
# UPIShield graph nodes: "payment_gateway", "primary_db", "bank_switch", etc.
SERVICE_MAPPING = {
    "PAYMENT_API": "payment_gateway",
    "BANK_DB": "primary_db",
    "UPI_GATEWAY": "bank_switch",
}

# Human-readable descriptions for logging
SERVICE_DESCRIPTIONS = {
    "PAYMENT_API": "Payment API (Banker) → Payment Gateway (UPIShield)",
    "BANK_DB": "Bank Database (Banker) → Primary Database (UPIShield)",
    "UPI_GATEWAY": "UPI Gateway (Banker) → Bank Switch (UPIShield)",
    "AUTH_API": "Authentication API (Banker) — No UPIShield equivalent",
    "PAYMENT_PROCESSOR": "Payment Processing Service (Banker) — No UPIShield equivalent",
    "EXTERNAL_PAYMENTS": "External Payments (Banker) — No UPIShield equivalent",
}


def normalize_service(service_id: str) -> str:
    """Normalize Banker service ID for mapping lookup.
    
    Banker sends service IDs as uppercase with underscores (e.g., "PAYMENT_API").
    This function ensures consistent formatting before mapping lookup.
    
    Args:
        service_id: Raw service ID from Banker event
        
    Returns:
        Normalized service ID (uppercase, stripped whitespace)
    """
    return service_id.upper().strip()


def get_mapped_service(service_id: str) -> str | None:
    """Map a Banker service ID to a UPIShield graph node ID.
    
    Args:
        service_id: Banker service ID (will be normalized)
        
    Returns:
        UPIShield graph node ID if mapped, None if unmapped
    """
    normalized = normalize_service(service_id)
    return SERVICE_MAPPING.get(normalized)


def is_mapped(service_id: str) -> bool:
    """Check if a Banker service ID has a UPIShield mapping.
    
    Args:
        service_id: Banker service ID
        
    Returns:
        True if the service has a mapping, False otherwise
    """
    return get_mapped_service(service_id) is not None


def get_service_description(service_id: str) -> str:
    """Get a human-readable description for a service ID.
    
    Args:
        service_id: Banker service ID
        
    Returns:
        Description string explaining the mapping or lack thereof
    """
    normalized = normalize_service(service_id)
    return SERVICE_DESCRIPTIONS.get(normalized, f"Unknown service: {service_id}")
