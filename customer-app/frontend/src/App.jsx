import { useState } from "react";
import { useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import SendMoney from "./pages/SendMoney";

export default function App() {
  const { user, loading, logout } = useAuth();
  const [view, setView] = useState("dashboard");

  if (loading) return <p className="center">Loading...</p>;
  if (!user) return <Login />;

  return (
    <div className="card">
      {user.is_mock && (
        <div className="mock-banner">MOCK MODE: demo data only, no real transactions.</div>
      )}
      <div className="nav">
        <strong>{user.name}</strong>
        <span>({user.customer_id})</span>
        <span className="spacer" />
        <button className={view === "dashboard" ? "active" : ""} onClick={() => setView("dashboard")}>
          Dashboard
        </button>
        <button className={view === "send" ? "active" : ""} onClick={() => setView("send")}>
          Send Money
        </button>
        <button onClick={() => { setView("dashboard"); logout(); }}>Log out</button>
      </div>
      {view === "dashboard" ? <Dashboard /> : <SendMoney isMock={user.is_mock} />}
    </div>
  );
}