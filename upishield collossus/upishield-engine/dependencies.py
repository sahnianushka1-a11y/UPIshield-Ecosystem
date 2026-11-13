
import networkx as nx

# =====================================================
# UPISHIELD AI - PAYMENT ECOSYSTEM DEPENDENCY GRAPH
# =====================================================

# Directed graph:
# A -> B means A depends on B.

bank_graph = nx.DiGraph()


# 1. SYNTHETIC PAYMENT ECOSYSTEM
# These are infrastructure components, NOT failure events.

services = [
    {
        "id": "upi_app_1",
        "name": "UPI Customer App A",
        "type": "TPAP",
        "owner": "App Provider A",
        "region": "Bangalore",
        "criticality": "HIGH"
    },
    {
        "id": "upi_app_2",
        "name": "UPI Customer App B",
        "type": "TPAP",
        "owner": "App Provider B",
        "region": "Mumbai",
        "criticality": "HIGH"
    },
    {
        "id": "psp_1",
        "name": "PSP Bank A",
        "type": "PSP",
        "owner": "Bank A",
        "region": "Bangalore",
        "criticality": "CRITICAL"
    },
    {
        "id": "psp_2",
        "name": "PSP Bank B",
        "type": "PSP",
        "owner": "Bank B",
        "region": "Mumbai",
        "criticality": "CRITICAL"
    },
    {
        "id": "sponsor_api",
        "name": "Sponsor Bank API",
        "type": "BANK_API",
        "owner": "Sponsor Bank",
        "region": "Bangalore",
        "criticality": "CRITICAL"
    },
    {
        "id": "bank_switch",
        "name": "Bank Transaction Switch",
        "type": "SWITCH",
        "owner": "Sponsor Bank",
        "region": "Bangalore",
        "criticality": "CRITICAL"
    },
    {
        "id": "payment_gateway",
        "name": "Payment Gateway",
        "type": "GATEWAY",
        "owner": "Payment Provider",
        "region": "Bangalore",
        "criticality": "HIGH"
    },
    {
        "id": "primary_cloud",
        "name": "Primary Cloud Service",
        "type": "CLOUD",
        "owner": "Cloud Provider A",
        "region": "Mumbai",
        "criticality": "CRITICAL"
    },
    {
        "id": "primary_db",
        "name": "Primary Transaction Database",
        "type": "DATABASE",
        "owner": "Sponsor Bank",
        "region": "Mumbai",
        "criticality": "CRITICAL"
    },
    {
        "id": "backup_cloud",
        "name": "Backup Cloud Service",
        "type": "CLOUD",
        "owner": "Cloud Provider B",
        "region": "Hyderabad",
        "criticality": "HIGH"
    },
    {
        "id": "backup_db",
        "name": "Backup Transaction Database",
        "type": "DATABASE",
        "owner": "Sponsor Bank",
        "region": "Hyderabad",
        "criticality": "HIGH"
    },
    {
        "id": "merchant",
        "name": "Merchant Payment Service",
        "type": "MERCHANT",
        "owner": "Merchant A",
        "region": "Bangalore",
        "criticality": "MEDIUM"
    }
]


# 2. ADD INFRASTRUCTURE NODES

def build_graph():

    bank_graph.clear()

    for service in services:
        bank_graph.add_node(
            service["id"],
            **service,
            health="HEALTHY"
        )

    # 3. DEFINE INFRASTRUCTURE RELATIONSHIPS

    dependencies = [
        ("upi_app_1", "psp_1", "depends_on", 1200, 45),
        ("upi_app_2", "psp_2", "depends_on", 900, 50),

        ("psp_1", "sponsor_api", "calls", 1100, 65),
        ("psp_2", "sponsor_api", "calls", 850, 70),

        ("sponsor_api", "bank_switch", "routes_through", 1900, 30),
        ("bank_switch", "primary_cloud", "depends_on", 1800, 40),
        ("primary_cloud", "primary_db", "depends_on", 1800, 25),

        ("payment_gateway", "sponsor_api", "calls", 700, 55),
        ("merchant", "payment_gateway", "routes_through", 500, 80),

        ("backup_cloud", "backup_db", "depends_on", 400, 30)
    ]

    for source, target, dep_type, volume, latency in dependencies:

        bank_graph.add_edge(
            source,
            target,
            dependency_type=dep_type,
            call_volume=volume,
            typical_latency=latency
        )


# 4. UPDATE HEALTH FROM AN EXTERNAL FAILURE EVENT
# The bank backend decides which service has failed.
# This function does not inject or invent failures.

def update_service_health(service_id, health):

    if service_id not in bank_graph:
        return {
            "success": False,
            "message": "Unknown service ID"
        }

    allowed_states = [
        "HEALTHY",
        "DEGRADED",
        "FAILED",
        "RECOVERING",
        "STANDBY"
    ]

    health = health.upper()

    if health not in allowed_states:
        return {
            "success": False,
            "message": "Invalid health state"
        }

    bank_graph.nodes[service_id]["health"] = health

    return {
        "success": True,
        "service_id": service_id,
        "health": health
    }


# 5. FIND DOWNSTREAM AFFECTED SERVICES

def get_affected_services(failed_service):

    if failed_service not in bank_graph:
        return []

    return list(nx.ancestors(bank_graph, failed_service))


# 6. GET COMPLETE GRAPH DATA FOR DASHBOARD

def get_graph_data():

    nodes = []

    for node_id, data in bank_graph.nodes(data=True):

        nodes.append({
            "id": node_id,
            "data": {
                "label": data["name"],
                "type": data["type"],
                "owner": data["owner"],
                "region": data["region"],
                "criticality": data["criticality"],
                "health": data["health"]
            }
        })

    edges = []

    for source, target, data in bank_graph.edges(data=True):

        edges.append({
            "id": f"{source}-{target}",
            "source": source,
            "target": target,
            "label": data["dependency_type"],
            "dependency_type": data["dependency_type"],
            "call_volume": data["call_volume"],
            "typical_latency": data["typical_latency"]
        })

    return {
        "nodes": nodes,
        "edges": edges
    }


# 7. INITIALIZE THE GRAPH WHEN MODULE LOADS

build_graph()


# 8. BASIC GRAPH TEST

if __name__ == "__main__":

    print("\nUPISHIELD PAYMENT ECOSYSTEM")
    print("=" * 45)

    print("Total nodes:", bank_graph.number_of_nodes())
    print("Total connections:", bank_graph.number_of_edges())

    print("\nInitial infrastructure health:")

    for node, data in bank_graph.nodes(data=True):
        print(data["name"], ":", data["health"])

    print("\nNo failures have been injected.")
