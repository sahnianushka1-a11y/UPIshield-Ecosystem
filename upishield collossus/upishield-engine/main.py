
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from safety import evaluate_transaction_safety

# Module 1: Dependency Graph
from dependencies import (
    bank_graph,
    update_service_health,
    get_affected_services,
    get_graph_data
)

# Module 3: Cascade Analysis
from cascade import analyze_cascade

# Module 4: Recovery Advisor
from recovery import get_recovery_recommendation


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
    cascade_result = analyze_cascade(service_id)

    # STEP 6: Run Module 4 - Recovery Advisor
    recovery_result = get_recovery_recommendation(service_id)

    # STEP 7: Return complete incident analysis
    return {
        "success": True,

        "event": "FAILURE_DETECTED",

        "failure": {
            "service_id": service_id,
            "service_name": bank_graph.nodes[service_id]["name"],
            "failure_type": event.failure_type,
            "severity": event.severity,
            "status": "FAILED"
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

    result = analyze_cascade(service_id)

    return result


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

    return get_recovery_recommendation(service_id)


@app.post("/recovery")
def request_recovery(request: RecoveryRequest):

    service_id = request.service_id

    if service_id not in bank_graph:
        raise HTTPException(
            status_code=404,
            detail=f"Unknown service: {service_id}"
        )

    return get_recovery_recommendation(service_id)


# --------------------------------------------------
# RESET SIMULATION
# --------------------------------------------------

@app.post("/reset")
def reset_simulation():

    for service_id in bank_graph.nodes:
        update_service_health(
            service_id,
            "HEALTHY"
        )

    return {
        "success": True,
        "message": "Simulation reset successfully",
        "status": "ALL_SERVICES_HEALTHY",
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