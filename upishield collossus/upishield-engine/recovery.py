
from dependencies import bank_graph


# Maps primary infrastructure services to their backup services
RECOVERY_MAP = {
    "primary_cloud": "backup_cloud",
    "primary_db": "backup_db"
}

AVAILABLE_STATES = ["HEALTHY", "STANDBY"]


def get_recovery_recommendation(failed_service):

    # Check whether the failed service exists
    if failed_service not in bank_graph:
        return {
            "success": False,
            "message": f"Unknown service: {failed_service}"
        }

    failed_node = bank_graph.nodes[failed_service]

    # Find the corresponding backup
    backup_service = RECOVERY_MAP.get(failed_service)

    # No mapped backup exists
    if not backup_service:
        return {
            "success": True,
            "recovery_status": "MANUAL_INTERVENTION_REQUIRED",
            "failed_service": failed_service,
            "recommendation": "ESCALATE_TO_BANK_OPERATIONS",
            "message": "No mapped backup service is available. Bank operations must investigate and decide the recovery procedure."
        }

    # Check whether the backup exists
    if backup_service not in bank_graph:
        return {
            "success": False,
            "message": f"Backup service {backup_service} not found"
        }

    backup_node = bank_graph.nodes[backup_service]
    backup_health = backup_node.get("health", "UNKNOWN")

    # Check backup health
    if backup_health not in AVAILABLE_STATES:
        return {
            "success": True,
            "recovery_status": "BACKUP_UNAVAILABLE",
            "failed_service": failed_service,
            "backup_service": backup_service,
            "backup_health": backup_health,
            "recommendation": "ESCALATE_TO_BANK_OPERATIONS",
            "message": "The backup service is not healthy. Automatic failover is not recommended."
        }

    # Backup is available
    return {
        "success": True,
        "recovery_status": "RECOVERY_RECOMMENDED",
        "failed_service": {
            "service_id": failed_service,
            "name": failed_node["name"],
            "health": failed_node.get("health", "UNKNOWN")
        },
        "backup_service": {
            "service_id": backup_service,
            "name": backup_node["name"],
            "health": backup_health
        },
        "recommendation": "SWITCH_TO_BACKUP",
        "message": f"{backup_node['name']} is available. UPIShield recommends switching traffic to this backup service.",
        "automatic_execution": False
    }
