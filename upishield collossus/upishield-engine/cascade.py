
import networkx as nx

from dependencies import bank_graph


# ==========================================
# CASCADE IMPACT CONFIGURATION
# ==========================================

CRITICALITY_WEIGHTS = {
    "CRITICAL": 10,
    "HIGH": 7,
    "MEDIUM": 4,
    "LOW": 1
}


# ==========================================
# CASCADE FAILURE ANALYSIS
# ==========================================

def analyze_cascade(failed_service, active_failures=None):

    # Check whether the failed service exists
    if failed_service not in bank_graph:
        return {
            "success": False,
            "message": f"Unknown service: {failed_service}"
        }

    failed_node = bank_graph.nodes[failed_service]

    # Find all upstream services that depend on this service.
    # Edge direction: A -> B means A depends on B.
    affected_services = nx.ancestors(
        bank_graph,
        failed_service
    )

    affected_details = []

    total_impact_score = 0

    direct_count = 0
    indirect_count = 0

    affected_customer_apps = []
    active_failures = active_failures or []
    related_failures = [
        failure for failure in active_failures
        if (failure.get("graph_service") or failure.get("service_id")) == failed_service
    ]

    # ==========================================
    # ANALYSE EACH AFFECTED SERVICE
    # ==========================================

    for service_id in affected_services:

        service = bank_graph.nodes[service_id]

        # Find dependency path from affected service
        # to the failed service.
        path = nx.shortest_path(
            bank_graph,
            source=service_id,
            target=failed_service
        )

        # Number of dependency connections
        distance = len(path) - 1

        # Direct or indirect impact
        if distance == 1:
            impact_type = "DIRECT"
            direct_count += 1
        else:
            impact_type = "INDIRECT"
            indirect_count += 1

        # Criticality-based impact score
        criticality = service.get(
            "criticality",
            "LOW"
        )

        weight = CRITICALITY_WEIGHTS.get(
            criticality,
            1
        )

        # Give more weight to services closer to the failure.
        impact_score = round(
            weight / distance,
            2
        )

        total_impact_score += impact_score

        # Identify customer-facing applications
        if service.get("type") == "TPAP":
            affected_customer_apps.append({
                "service_id": service_id,
                "name": service["name"]
            })

        affected_details.append({
            "service_id": service_id,
            "name": service["name"],
            "type": service["type"],
            "criticality": criticality,
            "health": service.get("health", "UNKNOWN"),
            "impact_type": impact_type,
            "dependency_distance": distance,
            "impact_score": impact_score,
            "dependency_path": path
        })

        impacting_failures = [
            failure for failure in active_failures
            if (
                failure.get("graph_service") or failure.get("service_id")
            ) in bank_graph
            and service_id in nx.ancestors(
                bank_graph,
                failure.get("graph_service") or failure.get("service_id"),
            )
        ]
        if impacting_failures:
            affected_details[-1]["failure_sources"] = sorted({
                failure.get("source", "UNKNOWN")
                for failure in impacting_failures
            })
            affected_details[-1]["active_failure_ids"] = [
                failure.get("event_id") or failure.get("failure_id")
                for failure in impacting_failures
            ]
            affected_details[-1]["impact_reason"] = (
                "Depends directly on an active failed service"
                if distance == 1
                else "Depends indirectly on one or more active failed services"
            )

    # ==========================================
    # SORT BY MOST IMMEDIATE IMPACT
    # ==========================================

    affected_details.sort(
        key=lambda item: (
            item["dependency_distance"],
            -item["impact_score"]
        )
    )

    # ==========================================
    # CALCULATE OVERALL CASCADE SEVERITY
    # ==========================================

    failed_criticality = failed_node.get(
        "criticality",
        "LOW"
    )

    if (
        failed_criticality == "CRITICAL"
        and len(affected_services) > 0
    ):
        cascade_severity = "CRITICAL"

    elif (
        len(affected_services) >= 4
        or len(affected_customer_apps) > 0
    ):
        cascade_severity = "HIGH"

    elif len(affected_services) > 0:
        cascade_severity = "MEDIUM"

    else:
        cascade_severity = "LOW"

    # ==========================================
    # FINAL CASCADE REPORT
    # ==========================================

    return {
        "success": True,

        "analysis": "CASCADE_ANALYSIS_COMPLETED",

        "failed_service": {
            "service_id": failed_service,
            "name": failed_node["name"],
            "criticality": failed_criticality,
            "source": sorted({
                failure.get("source", "UNKNOWN")
                for failure in related_failures
            }) or ["UNKNOWN"],
            "active_failure_ids": [
                failure.get("event_id") or failure.get("failure_id")
                for failure in related_failures
            ],
        },

        "cascade_severity": cascade_severity,

        "summary": {
            "total_affected_services": len(affected_services),
            "directly_affected": direct_count,
            "indirectly_affected": indirect_count,
            "affected_customer_apps": len(
                affected_customer_apps
            ),
            "total_impact_score": round(
                total_impact_score,
                2
            )
        },

        "affected_customer_apps": affected_customer_apps,

        "affected_services": affected_details
    }


def analyze_active_failures(active_failures):
    """Return one de-duplicated impact report for all active failures."""
    reports = [
        analyze_cascade(
            failure.get("graph_service") or failure.get("service_id"),
            active_failures,
        )
        for failure in active_failures
        if (failure.get("graph_service") or failure.get("service_id")) in bank_graph
    ]
    merged = {}
    for report in reports:
        for service in report.get("affected_services", []):
            current = merged.get(service["service_id"])
            if current is None or service["dependency_distance"] < current["dependency_distance"]:
                merged[service["service_id"]] = dict(service)
            else:
                current["failure_sources"] = sorted(set(
                    current.get("failure_sources", [])
                    + service.get("failure_sources", [])
                ))
                current["active_failure_ids"] = sorted(set(
                    current.get("active_failure_ids", [])
                    + service.get("active_failure_ids", [])
                ))

    affected = sorted(
        merged.values(),
        key=lambda item: (item["dependency_distance"], -item["impact_score"]),
    )
    direct = sum(item["impact_type"] == "DIRECT" for item in affected)
    indirect = len(affected) - direct
    return {
        "success": True,
        "analysis": "ACTIVE_FAILURE_IMPACT_COMPLETED",
        "active_failure_ids": [
            failure.get("event_id") or failure.get("failure_id")
            for failure in active_failures
        ],
        "active_failure_sources": sorted({
            failure.get("source", "UNKNOWN") for failure in active_failures
        }),
        "summary": {
            "total_affected_services": len(affected),
            "directly_affected": direct,
            "indirectly_affected": indirect,
        },
        "affected_services": affected,
    }
