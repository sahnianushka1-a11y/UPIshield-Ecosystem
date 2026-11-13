import { useState } from "react";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const [customerId, setCustomerId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await login(customerId.trim(), password);
    } catch (err) {
      setError(err.response?.data?.detail || "Unable to reach the server. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card narrow">
      <h1>UPIShield Customer</h1>
      <form onSubmit={submit}>
        <label>Customer ID</label>
        <input value={customerId} onChange={(e) => setCustomerId(e.target.value)} required />
        <label>Password</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={busy}>{busy ? "Signing in..." : "Log in"}</button>
      </form>
    </div>
  );
}