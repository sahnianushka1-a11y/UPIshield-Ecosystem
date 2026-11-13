
import {
  ShieldCheck,
  LayoutDashboard,
  Network,
  ArrowLeftRight,
  AlertTriangle,
  Activity,
  Server,
  Database,
  Zap,
  Bell,
  UserCircle,
  Wifi,
  Clock,
  CheckCircle2,
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

// ==========================================
// DEPENDENCY GRAPH NODES
// ==========================================

const graphNodes = [
  { id: "upi_app_1", label: "UPI Customer App A", type: "TPAP", x: 0, y: 0 },
  { id: "upi_app_2", label: "UPI Customer App B", type: "TPAP", x: 0, y: 160 },

  { id: "psp_1", label: "PSP Bank A", type: "PSP", x: 260, y: 0 },
  { id: "psp_2", label: "PSP Bank B", type: "PSP", x: 260, y: 160 },

  { id: "sponsor_api", label: "Sponsor Bank API", type: "BANK API", x: 540, y: 80 },

  { id: "bank_switch", label: "Bank Transaction Switch", type: "SWITCH", x: 820, y: 80 },

  { id: "payment_gateway", label: "Payment Gateway", type: "GATEWAY", x: 260, y: 350 },

  { id: "primary_cloud", label: "Primary Cloud Service", type: "CLOUD", x: 1080, y: 0 },
  { id: "primary_db", label: "Primary Transaction DB", type: "DATABASE", x: 1350, y: 0 },

  { id: "backup_cloud", label: "Backup Cloud Service", type: "CLOUD", x: 1080, y: 230 },
  { id: "backup_db", label: "Backup Transaction DB", type: "DATABASE", x: 1350, y: 230 },

  { id: "merchant", label: "Merchant Payment Service", type: "MERCHANT", x: 0, y: 350 },
];

// ==========================================
// CREATE REACT FLOW NODES
// ==========================================

const initialNodes = graphNodes.map((item) => ({
  id: item.id,
  position: { x: item.x, y: item.y },
  data: {
    label: (
      <div>
        <strong>{item.label}</strong>
        <div style={{ fontSize: "11px", marginTop: "6px", color: "#22c55e" }}>
          {item.type} · HEALTHY
        </div>
      </div>
    ),
  },
  style: {
    background: "#14233a",
    color: "#ffffff",
    border: "1px solid #3b82f6",
    borderRadius: "10px",
    padding: "14px",
    width: 190,
    fontSize: "12px",
    textAlign: "center",
  },
}));

// ==========================================
// DEPENDENCY CONNECTIONS
// A -> B means A depends on B
// ==========================================

const connections = [
  ["upi_app_1", "psp_1"],
  ["upi_app_2", "psp_2"],

  ["psp_1", "sponsor_api"],
  ["psp_2", "sponsor_api"],

  ["sponsor_api", "bank_switch"],
  ["bank_switch", "primary_cloud"],
  ["primary_cloud", "primary_db"],

  ["payment_gateway", "sponsor_api"],
  ["merchant", "payment_gateway"],

  ["backup_cloud", "backup_db"],
];

const initialEdges = connections.map(([source, target]) => ({
  id: `${source}-${target}`,
  source,
  target,
  type: "smoothstep",
  animated: true,
  markerEnd: {
    type: MarkerType.ArrowClosed,
    color: "#64748b",
  },
  style: {
    stroke: "#64748b",
    strokeWidth: 2,
  },
}));

// ==========================================
// MAIN DASHBOARD
// ==========================================

function App() {
  const metrics = [
    {
      title: "Connected Customers",
      value: "1,284",
      change: "+12.5%",
      icon: UserCircle,
      color: "blue",
    },
    {
      title: "Total Transactions",
      value: "8,492",
      change: "+8.2%",
      icon: ArrowLeftRight,
      color: "purple",
    },
    {
      title: "Failed Transactions",
      value: "12",
      change: "Requires attention",
      icon: AlertTriangle,
      color: "red",
    },
    {
      title: "Recovered Transactions",
      value: "156",
      change: "+18.4%",
      icon: ShieldCheck,
      color: "green",
    },
  ];

  const systems = [
    {
      name: "Primary Bank Server",
      status: "Operational",
      latency: "42 ms",
    },
    {
      name: "Payment API",
      status: "Operational",
      latency: "86 ms",
    },
    {
      name: "Backup Infrastructure",
      status: "Standby",
      latency: "31 ms",
    },
  ];

  return (
    <div className="dashboard">

      {/* SIDEBAR */}

      <aside className="sidebar">

        <div className="brand">
          <div className="brand-logo">
            <ShieldCheck size={25} />
          </div>

          <div>
            <h2>UPIShield <span>AI</span></h2>
            <p>PAYMENT RESILIENCE</p>
          </div>
        </div>

        <p className="menu-heading">MAIN MENU</p>

        <nav>
          <div className="nav-item active">
            <LayoutDashboard /> Overview
          </div>

          <div className="nav-item">
            <Network /> Infrastructure
          </div>

          <div className="nav-item">
            <ArrowLeftRight /> Transactions
          </div>

          <div className="nav-item">
            <AlertTriangle /> Incidents
          </div>

          <div className="nav-item">
            <ShieldCheck /> Recovery Center
          </div>
        </nav>

        <div className="sidebar-footer">
          <div className="online-dot" />

          <div>
            <strong>Monitoring Active</strong>
            <p>Infrastructure protected</p>
          </div>
        </div>

      </aside>

      {/* MAIN CONTENT */}

      <main className="main">

        {/* TOP BAR */}

        <header className="topbar">

          <div>
            <p className="breadcrumb">Operations / Overview</p>
            <h2>Bank Operations Centre</h2>
          </div>

          <div className="top-actions">

            <div className="system-online">
              <span className="online-dot" />
              SYSTEM ONLINE
            </div>

            <Bell size={20} />

            <div className="admin">
              <UserCircle size={30} />

              <div>
                <strong>Bank Admin</strong>
                <p>BANK_001</p>
              </div>
            </div>

          </div>

        </header>

        <section className="content">

          {/* PAGE HEADING */}

          <div className="page-heading">

            <div>
              <p className="eyebrow">
                PAYMENT INFRASTRUCTURE MONITORING
              </p>

              <h1>Resilience Dashboard</h1>

              <p className="description">
                Monitor infrastructure, detect disruptions and manage payment recovery.
              </p>
            </div>

            <div className="live-label">
              <span className="online-dot" />
              LIVE MONITORING
            </div>

          </div>

          {/* METRICS */}

          <div className="metrics-grid">

            {metrics.map((metric) => {
              const Icon = metric.icon;

              return (
                <div className="metric-card" key={metric.title}>

                  <div className={`metric-icon ${metric.color}`}>
                    <Icon size={21} />
                  </div>

                  <p>{metric.title}</p>

                  <h2>{metric.value}</h2>

                  <span>{metric.change}</span>

                </div>
              );
            })}

          </div>

          {/* INFRASTRUCTURE AND INCIDENTS */}

          <div className="section-grid">

            <section className="panel infrastructure">

              <div className="panel-heading">

                <div>
                  <h3>Infrastructure Health</h3>
                  <p>Current status of critical payment services</p>
                </div>

                <Activity size={20} />

              </div>

              {systems.map((system) => (

                <div className="system-row" key={system.name}>

                  <div className="system-icon">
                    <Server size={20} />
                  </div>

                  <div className="system-info">
                    <strong>{system.name}</strong>
                    <p>{system.status}</p>
                  </div>

                  <div className="latency">
                    {system.latency}
                  </div>

                  <CheckCircle2 className="healthy-icon" size={19} />

                </div>

              ))}

            </section>

            {/* INCIDENT MONITOR */}

            <section className="panel incident-panel">

              <div className="panel-heading">

                <div>
                  <h3>Incident Monitor</h3>
                  <p>Infrastructure alerts</p>
                </div>

                <AlertTriangle color="#F59E0B" />

              </div>

              <div className="no-incidents">

                <ShieldCheck size={35} />

                <h3>No Active Incidents</h3>

                <p>All monitored services are operational.</p>

              </div>

            </section>

          </div>

          {/* FAILURE SIMULATION */}

          <section className="panel failure-section">

            <div className="panel-heading">

              <div>
                <h3>Failure Simulation Centre</h3>
                <p>
                  Inject controlled faults to test infrastructure resilience
                </p>
              </div>

              <Zap color="#F59E0B" />

            </div>

            <div className="failure-grid">

              <button className="failure-button">
                <Server /> Simulate Server Failure
              </button>

              <button className="failure-button">
                <Wifi /> Simulate Network Latency
              </button>

              <button className="failure-button">
                <Activity /> Simulate API Failure
              </button>

              <button className="failure-button">
                <Database /> Simulate Database Failure
              </button>

            </div>

          </section>

          {/* REACT FLOW DEPENDENCY GRAPH */}

          <section className="panel graph-section">

            <div className="panel-heading">

              <div>
                <h3>Infrastructure Dependency Graph</h3>
                <p>
                  Visual overview of payment system dependencies
                </p>
              </div>

              <Network size={20} />

            </div>

            <div
              style={{
                width: "100%",
                height: "500px",
                marginTop: "20px",
                background: "#0d1728",
                borderRadius: "12px",
                overflow: "hidden",
              }}
            >

              <ReactFlow
                nodes={initialNodes}
                edges={initialEdges}
                fitView
                fitViewOptions={{ padding: 0.2 }}
                nodesDraggable={false}
                nodesConnectable={false}
                elementsSelectable={true}
              >

                <Background
                  color="#334155"
                  gap={20}
                />

                <Controls />

                <MiniMap
                  nodeColor="#2563eb"
                  maskColor="rgba(5, 10, 25, 0.7)"
                />

              </ReactFlow>

            </div>

          </section>

          {/* FOOTER */}

          <footer>
            UPIShield AI · Bank Infrastructure Resilience Platform

            <span>
              <Clock size={13} />
              Demo Environment
            </span>
          </footer>

        </section>

      </main>

    </div>
  );
}

export default App;



