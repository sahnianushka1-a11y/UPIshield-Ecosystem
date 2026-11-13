
import { useCallback, useEffect, useState } from "react";

import {
  ShieldCheck,
  Network,
  Activity,
  Server,
  Database,
  Zap,
  AlertTriangle,
  RefreshCcw,
  CheckCircle2,
  Clock,
  Cloud,
  ArrowRight,
  LoaderCircle,
  RotateCcw,
} from "lucide-react";

import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  MarkerType,
} from "@xyflow/react";

import "@xyflow/react/dist/style.css";
import "./App.css";

const ENGINE_URL = "http://localhost:8001";

const failureOptions = [
  {
    id: "sponsor_api",
    label: "Sponsor Bank API",
    type: "API_FAILURE",
    icon: Server,
  },
  {
    id: "primary_cloud",
    label: "Primary Cloud",
    type: "CLOUD_FAILURE",
    icon: Cloud,
  },
  {
    id: "primary_db",
    label: "Primary Database",
    type: "DATABASE_FAILURE",
    icon: Database,
  },
  {
    id: "bank_switch",
    label: "Bank Transaction Switch",
    type: "SWITCH_FAILURE",
    icon: Zap,
  },
];

function getHealthColor(health) {
  switch (health) {
    case "FAILED":
      return "#ef4444";
    case "AT_RISK":
      return "#f59e0b";
    case "RECOVERING":
      return "#3b82f6";
    case "STANDBY":
      return "#a78bfa";
    case "DEGRADED":
      return "#fb923c";
    default:
      return "#22c55e";
  }
}

function ServiceNode({ data }) {
  const color = getHealthColor(data.health);

  return (
    <div
      style={{
        minWidth: 155,
        padding: 12,
        borderRadius: 12,
        border: `2px solid ${color}`,
        background: "#111827",
        color: "#fff",
        boxShadow: `0 0 12px ${color}30`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
        <span
          style={{
            width: 9,
            height: 9,
            borderRadius: "50%",
            background: color,
          }}
        />
        <strong style={{ fontSize: 12 }}>{data.label}</strong>
      </div>

      <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 7 }}>
        {data.type}
      </div>

      <div
        style={{
          fontSize: 10,
          marginTop: 5,
          color,
          fontWeight: 700,
        }}
      >
        {data.health || "UNKNOWN"}
      </div>
    </div>
  );
}

const nodeTypes = {
  service: ServiceNode,
};

function App() {
  const [graph, setGraph] = useState({
    nodes: [],
    edges: [],
  });

  const [selectedService, setSelectedService] = useState("sponsor_api");

  const [failureData, setFailureData] = useState(null);

  const [recoveryActionResult, setRecoveryActionResult] = useState(null);

  const [loading, setLoading] = useState(false);
  const [requestingRecovery, setRequestingRecovery] = useState(false);
  const [resetting, setResetting] = useState(false);

  const [error, setError] = useState("");
  const [connectionStatus, setConnectionStatus] = useState("CONNECTING");

  // ------------------------------------------
  // FETCH LIVE DEPENDENCY GRAPH
  // ------------------------------------------

  const fetchGraph = useCallback(async () => {
    try {
      const response = await fetch(`${ENGINE_URL}/graph`);

      if (!response.ok) {
        throw new Error("Unable to fetch dependency graph");
      }

      const data = await response.json();

      setGraph({
        nodes: (data.nodes || []).map((node, index) => ({
          id: node.id,
          type: "service",
          position: {
            x: 100 + (index % 4) * 240,
            y: 100 + Math.floor(index / 4) * 170,
          },
          data: {
            ...node.data,
            health: node.data?.health || "HEALTHY",
          },
        })),

        edges: (data.edges || []).map((edge) => ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          label: edge.label,
          animated: false,
          markerEnd: {
            type: MarkerType.ArrowClosed,
          },
          style: {
            stroke: "#64748b",
            strokeWidth: 1.5,
          },
          labelStyle: {
            fill: "#cbd5e1",
            fontSize: 10,
          },
        })),
      });

      setConnectionStatus("ONLINE");
    } catch (err) {
      setConnectionStatus("OFFLINE");
      setError(
        "Cannot connect to UPIShield backend. Check whether port 8001 is running."
      );
    }
  }, []);

  useEffect(() => {
    fetchGraph();

    const interval = setInterval(fetchGraph, 3000);

    return () => clearInterval(interval);
  }, [fetchGraph]);

  // ------------------------------------------
  // INJECT FAILURE
  // ------------------------------------------

  const injectFailure = async (service) => {
    setLoading(true);
    setError("");
    setRecoveryActionResult(null);
    setFailureData(null);

    try {
      const response = await fetch(`${ENGINE_URL}/events/failure`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          service_id: service.id,
          failure_type: service.type,
          severity: "CRITICAL",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Failure injection failed");
      }

      // This endpoint already returns:
      // failure + cascade_analysis + recovery_advisor

      setFailureData(data);

      await fetchGraph();
    } catch (err) {
      setError(err.message || "Could not inject failure");
    } finally {
      setLoading(false);
    }
  };

  // ------------------------------------------
  // REQUEST RECOVERY
  // ------------------------------------------

  const requestRecovery = async () => {
    const failedServiceId = failureData?.failure?.service_id;

    if (!failedServiceId) {
      setError("Inject a failure before requesting recovery.");
      return;
    }

    setRequestingRecovery(true);
    setError("");
    setRecoveryActionResult(null);

    try {
      const response = await fetch(`${ENGINE_URL}/recovery`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          service_id: failedServiceId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Recovery request failed");
      }

      setRecoveryActionResult(data);

      await fetchGraph();
    } catch (err) {
      setError(err.message || "Could not request recovery");
    } finally {
      setRequestingRecovery(false);
    }
  };

  // ------------------------------------------
  // RESET SIMULATION
  // ------------------------------------------

  const resetSimulation = async () => {
    setResetting(true);
    setError("");

    try {
      const response = await fetch(`${ENGINE_URL}/reset`, {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Reset failed");
      }

      setFailureData(null);
      setRecoveryActionResult(null);

      await fetchGraph();
    } catch (err) {
      setError(err.message || "Could not reset simulation");
    } finally {
      setResetting(false);
    }
  };

  // ------------------------------------------
  // METRICS
  // ------------------------------------------

  const failedCount = graph.nodes.filter(
    (node) => node.data.health === "FAILED"
  ).length;

  const atRiskCount = graph.nodes.filter(
    (node) => node.data.health === "AT_RISK"
  ).length;

  const healthyCount = graph.nodes.filter(
    (node) => node.data.health === "HEALTHY"
  ).length;

  const cascade = failureData?.cascade_analysis;
  const recovery = failureData?.recovery_advisor;

  const recoveryResult = recoveryActionResult || recovery;

  const failedService = failureData?.failure;

  // ------------------------------------------
  // UI
  // ------------------------------------------

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#080d19",
        color: "#f8fafc",
        padding: 24,
        fontFamily: "Inter, sans-serif",
      }}
    >
      {/* HEADER */}

      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16,
          marginBottom: 28,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <ShieldCheck size={34} color="#38bdf8" />

          <div>
            <h1 style={{ margin: 0, fontSize: 25 }}>
              UPIShield <span style={{ color: "#38bdf8" }}>AI</span>
            </h1>

            <p style={{ margin: 0, color: "#94a3b8", fontSize: 12 }}>
              Bank Infrastructure Resilience Platform
            </p>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            border: "1px solid #263449",
            borderRadius: 20,
            padding: "8px 14px",
          }}
        >
          <span
            style={{
              width: 9,
              height: 9,
              borderRadius: "50%",
              background:
                connectionStatus === "ONLINE" ? "#22c55e" : "#ef4444",
            }}
          />

          <span style={{ fontSize: 12 }}>
            Backend: {connectionStatus}
          </span>
        </div>
      </header>

      {/* METRICS */}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))",
          gap: 14,
          marginBottom: 24,
        }}
      >
        {[
          {
            label: "Total Services",
            value: graph.nodes.length,
            icon: Network,
          },
          {
            label: "Healthy",
            value: healthyCount,
            icon: CheckCircle2,
            color: "#22c55e",
          },
          {
            label: "At Risk",
            value: atRiskCount,
            icon: AlertTriangle,
            color: "#f59e0b",
          },
          {
            label: "Failed",
            value: failedCount,
            icon: Activity,
            color: "#ef4444",
          },
        ].map((metric) => {
          const Icon = metric.icon;

          return (
            <div
              key={metric.label}
              style={{
                background: "#111827",
                border: "1px solid #263449",
                padding: 18,
                borderRadius: 14,
              }}
            >
              <Icon color={metric.color || "#38bdf8"} size={21} />

              <h2 style={{ fontSize: 27, margin: "12px 0 4px" }}>
                {metric.value}
              </h2>

              <p style={{ color: "#94a3b8", margin: 0, fontSize: 12 }}>
                {metric.label}
              </p>
            </div>
          );
        })}
      </div>

      {/* ERROR */}

      {error && (
        <div
          style={{
            background: "#451a1a",
            color: "#fecaca",
            padding: 14,
            borderRadius: 10,
            marginBottom: 18,
          }}
        >
          <AlertTriangle size={16} style={{ marginRight: 8 }} />
          {error}
        </div>
      )}

      {/* MAIN LAYOUT */}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(280px, 0.85fr) minmax(400px, 2fr)",
          gap: 20,
          alignItems: "start",
        }}
      >
        {/* FAILURE PANEL */}

        <section
          style={{
            background: "#111827",
            border: "1px solid #263449",
            padding: 20,
            borderRadius: 16,
          }}
        >
          <h2 style={{ fontSize: 17, display: "flex", gap: 9 }}>
            <Zap size={20} color="#f59e0b" />
            Simulate Injected Failures
          </h2>

          <p style={{ color: "#94a3b8", fontSize: 12, lineHeight: 1.6 }}>
            Select an infrastructure service. UPIShield will analyse the
            resulting simulated failure and recommend a recovery action.
          </p>

          <label style={{ fontSize: 12, color: "#94a3b8" }}>
            Select service
          </label>

          <select
            value={selectedService}
            onChange={(event) => setSelectedService(event.target.value)}
            style={{
              display: "block",
              width: "100%",
              marginTop: 8,
              padding: 12,
              borderRadius: 9,
              background: "#080d19",
              color: "#fff",
              border: "1px solid #334155",
            }}
          >
            {failureOptions.map((service) => (
              <option key={service.id} value={service.id}>
                {service.label}
              </option>
            ))}
          </select>

          <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
            {failureOptions.map((service) => {
              const Icon = service.icon;

              return (
                <button
                  key={service.id}
                  disabled={loading || resetting || requestingRecovery}
                  onClick={() => {
                    setSelectedService(service.id);
                    injectFailure(service);
                  }}
                  style={{
                    padding: 13,
                    background:
                      selectedService === service.id ? "#1e3a5f" : "#172033",
                    color: "#fff",
                    border: "1px solid #334155",
                    borderRadius: 9,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    textAlign: "left",
                    opacity: loading ? 0.6 : 1,
                  }}
                >
                  <Icon size={18} color="#f87171" />

                  <span style={{ fontSize: 12 }}>
                    Inject {service.label} Failure
                  </span>
                </button>
              );
            })}
          </div>

          <button
            disabled={resetting || loading || requestingRecovery}
            onClick={resetSimulation}
            style={{
              width: "100%",
              padding: 13,
              marginTop: 18,
              borderRadius: 9,
              background: "#263449",
              color: "#fff",
              border: "none",
              cursor: "pointer",
            }}
          >
            <RefreshCcw size={15} style={{ marginRight: 8 }} />

            {resetting ? "Resetting..." : "Reset Simulation"}
          </button>

          {(loading || resetting || requestingRecovery) && (
            <p style={{ color: "#38bdf8", fontSize: 12 }}>
              <LoaderCircle
                size={14}
                style={{ marginRight: 6, verticalAlign: "middle" }}
              />
              Processing backend request...
            </p>
          )}
        </section>

        {/* DEPENDENCY GRAPH */}

        <section
          style={{
            background: "#111827",
            border: "1px solid #263449",
            padding: 18,
            borderRadius: 16,
            minWidth: 0,
          }}
        >
          <h2 style={{ fontSize: 17, display: "flex", gap: 9 }}>
            <Network size={20} color="#38bdf8" />
            Live Dependency Graph
          </h2>

          <p style={{ color: "#94a3b8", fontSize: 12 }}>
            Service health is fetched from the UPIShield backend every 3 seconds.
          </p>

          <div style={{ height: 530, borderRadius: 12, overflow: "hidden" }}>
            <ReactFlow
              nodes={graph.nodes}
              edges={graph.edges}
              nodeTypes={nodeTypes}
              fitView
              fitViewOptions={{ padding: 0.2 }}
            >
              <Background color="#334155" gap={20} />
              <Controls />

              <MiniMap
                nodeColor={(node) =>
                  getHealthColor(node.data?.health)
                }
                style={{ background: "#172033" }}
              />
            </ReactFlow>
          </div>

          <div
            style={{
              display: "flex",
              gap: 16,
              flexWrap: "wrap",
              marginTop: 14,
              fontSize: 11,
              color: "#94a3b8",
            }}
          >
            <span>🟢 Healthy</span>
            <span>🔴 Failed</span>
            <span>🟠 At Risk</span>
            <span>🔵 Recovering</span>
          </div>
        </section>
      </div>

      {/* FAILURE AND CASCADE ANALYSIS */}

      {failureData && (
        <section
          style={{
            marginTop: 22,
            background: "#111827",
            border: "1px solid #263449",
            borderRadius: 16,
            padding: 20,
          }}
        >
          <h2 style={{ fontSize: 19 }}>
            <AlertTriangle
              size={20}
              color="#ef4444"
              style={{ marginRight: 9 }}
            />
            Failure & Cascade Analysis
          </h2>

          <div
            style={{
              padding: 15,
              background: "#451a1a",
              borderRadius: 10,
              marginTop: 15,
            }}
          >
            <strong style={{ color: "#fca5a5" }}>
              {failedService?.service_name} — FAILED
            </strong>

            <p style={{ color: "#fecaca", fontSize: 12 }}>
              Service ID: {failedService?.service_id}
            </p>

            <p style={{ color: "#fecaca", fontSize: 12 }}>
              Failure type: {failedService?.failure_type}
            </p>

            <p style={{ color: "#fecaca", fontSize: 12 }}>
              Severity: {failedService?.severity}
            </p>
          </div>

          {cascade && (
            <>
              <h3 style={{ marginTop: 22 }}>Cascade Impact</h3>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))",
                  gap: 12,
                }}
              >
                {[
                  [
                    "Affected Services",
                    cascade.summary?.total_affected_services,
                  ],
                  ["Direct Impact", cascade.summary?.directly_affected],
                  ["Indirect Impact", cascade.summary?.indirectly_affected],
                  [
                    "Customer Apps",
                    cascade.summary?.affected_customer_apps,
                  ],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    style={{
                      background: "#172033",
                      borderRadius: 10,
                      padding: 15,
                    }}
                  >
                    <h2 style={{ margin: 0 }}>{value ?? 0}</h2>

                    <p style={{ color: "#94a3b8", fontSize: 11 }}>
                      {label}
                    </p>
                  </div>
                ))}
              </div>

              <p style={{ marginTop: 16 }}>
                Cascade Severity:{" "}
                <strong
                  style={{
                    color:
                      cascade.cascade_severity === "CRITICAL"
                        ? "#ef4444"
                        : cascade.cascade_severity === "HIGH"
                        ? "#f59e0b"
                        : "#38bdf8",
                  }}
                >
                  {cascade.cascade_severity}
                </strong>
              </p>

              <p style={{ color: "#94a3b8", fontSize: 12 }}>
                Total Impact Score:{" "}
                {cascade.summary?.total_impact_score ?? 0}
              </p>

              <h3>Affected Services</h3>

              <div style={{ overflowX: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: 12,
                    textAlign: "left",
                  }}
                >
                  <thead>
                    <tr style={{ color: "#94a3b8" }}>
                      <th style={{ padding: 10 }}>Service</th>
                      <th>Impact</th>
                      <th>Criticality</th>
                      <th>Distance</th>
                      <th>Impact Score</th>
                    </tr>
                  </thead>

                  <tbody>
                    {(cascade.affected_services || []).map((service) => (
                      <tr
                        key={service.service_id}
                        style={{ borderTop: "1px solid #263449" }}
                      >
                        <td style={{ padding: 10 }}>
                          <strong>{service.name}</strong>

                          <div style={{ color: "#64748b", fontSize: 10 }}>
                            {service.service_id}
                          </div>
                        </td>

                        <td
                          style={{
                            color:
                              service.impact_type === "DIRECT"
                                ? "#f87171"
                                : "#f59e0b",
                          }}
                        >
                          {service.impact_type}
                        </td>

                        <td>{service.criticality}</td>

                        <td>{service.dependency_distance}</td>

                        <td>{service.impact_score}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p
                style={{
                  color: "#94a3b8",
                  fontSize: 11,
                  marginTop: 12,
                }}
              >
                Note: AT_RISK services are potentially affected. This analysis
                does not confirm that they have actually failed.
              </p>
            </>
          )}
        </section>
      )}

      {/* RECOVERY ADVISOR */}

      {recovery && (
        <section
          style={{
            marginTop: 22,
            background: "#111827",
            border: "1px solid #263449",
            borderRadius: 16,
            padding: 22,
          }}
        >
          <h2 style={{ display: "flex", gap: 9, alignItems: "center" }}>
            <ShieldCheck size={23} color="#38bdf8" />
            UPIShield Recovery Advisor
          </h2>

          <div
            style={{
              background:
                recoveryResult?.recovery_status === "RECOVERY_RECOMMENDED"
                  ? "#123524"
                  : "#42251c",
              padding: 17,
              borderRadius: 12,
              marginTop: 16,
            }}
          >
            <p style={{ fontSize: 11, color: "#cbd5e1" }}>
              RECOVERY STATUS
            </p>

            <h2 style={{ margin: "8px 0" }}>
              {recoveryResult?.recovery_status || "ANALYSIS COMPLETED"}
            </h2>

            <strong style={{ color: "#7dd3fc" }}>
              {recoveryResult?.recommendation}
            </strong>

            <p style={{ fontSize: 13, lineHeight: 1.6 }}>
              {recoveryResult?.message}
            </p>
          </div>

          {recoveryResult?.backup_service && (
            <div
              style={{
                marginTop: 17,
                display: "flex",
                alignItems: "center",
                gap: 15,
                flexWrap: "wrap",
              }}
            >
              <div>
                <p style={{ fontSize: 11, color: "#94a3b8" }}>
                  FAILED SERVICE
                </p>

                <strong>
                  {typeof recoveryResult.failed_service === "object"
                    ? recoveryResult.failed_service.name
                    : failedService?.service_name}
                </strong>
              </div>

              <ArrowRight color="#38bdf8" />

              <div>
                <p style={{ fontSize: 11, color: "#94a3b8" }}>
                  RECOMMENDED BACKUP
                </p>

                <strong>{recoveryResult.backup_service.name}</strong>

                <p style={{ color: "#22c55e", fontSize: 11 }}>
                  Health: {recoveryResult.backup_service.health}
                </p>
              </div>
            </div>
          )}

          {recoveryResult?.backup_health && (
            <p style={{ color: "#f59e0b", fontSize: 12 }}>
              Backup health: {recoveryResult.backup_health}
            </p>
          )}

          {/* REQUEST RECOVERY */}

          <div
            style={{
              marginTop: 22,
              padding: 17,
              background: "#172033",
              borderRadius: 12,
            }}
          >
            <h3 style={{ marginTop: 0, fontSize: 15 }}>
              Recovery Action
            </h3>

            <p style={{ color: "#94a3b8", fontSize: 12, lineHeight: 1.6 }}>
              Request the backend to evaluate the recovery recommendation
              again for the failed service.
            </p>

            <button
              onClick={requestRecovery}
              disabled={requestingRecovery || loading || resetting}
              style={{
                width: "100%",
                padding: 14,
                borderRadius: 9,
                background: requestingRecovery ? "#334155" : "#0369a1",
                color: "#fff",
                border: "none",
                cursor: requestingRecovery ? "not-allowed" : "pointer",
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 9,
              }}
            >
              {requestingRecovery ? (
                <>
                  <LoaderCircle size={17} />
                  Requesting Recovery...
                </>
              ) : (
                <>
                  <RotateCcw size={17} />
                  Request Recovery
                </>
              )}
            </button>

            {recoveryActionResult && (
              <div
                style={{
                  marginTop: 15,
                  padding: 14,
                  borderRadius: 9,
                  background: "#123524",
                  border: "1px solid #166534",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    alignItems: "center",
                    color: "#86efac",
                    fontWeight: 700,
                    fontSize: 13,
                  }}
                >
                  <CheckCircle2 size={17} />
                  Recovery request processed
                </div>

                <p style={{ fontSize: 12, color: "#d1fae5" }}>
                  Status: {recoveryActionResult.recovery_status}
                </p>

                <p style={{ fontSize: 12, color: "#d1fae5" }}>
                  Recommendation: {recoveryActionResult.recommendation}
                </p>

                <p style={{ fontSize: 12, color: "#d1fae5" }}>
                  {recoveryActionResult.message}
                </p>
              </div>
            )}
          </div>

          <p style={{ color: "#94a3b8", fontSize: 11, marginTop: 18 }}>
            <Clock size={13} style={{ marginRight: 6 }} />
            Recovery request currently returns a recommendation only.
            Actual traffic failover is not implemented.
          </p>
        </section>
      )}

      <footer
        style={{
          textAlign: "center",
          color: "#64748b",
          fontSize: 11,
          marginTop: 30,
        }}
      >
        UPIShield AI · Simulated Infrastructure Resilience Environment
      </footer>
    </div>
  );
}

export default App;
