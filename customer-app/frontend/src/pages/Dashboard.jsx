import { useCallback, useEffect, useState } from "react";
import api, { errorText } from "../api/client";
import StatusBadge from "../components/StatusBadge";

const inr = (n) =>
  Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function Dashboard() {
  const [account, setAccount] = useState(null);
  const [txns, setTxns] = useState([]);
  const [payments, setPayments] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [a, t, p] = await Promise.all([
        api.get("/api/account"),
        api.get("/api/transactions?limit=10"),
        api.get("/api/payments"),
      ]);
      setAccount(a.data);
      setTxns(t.data);
      setPayments(p.data);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const check = async (key) => {
    setChecking(key);
    try {
      await api.post(`/api/payments/${key}/refresh`);
    } catch (err) {
      setError(errorText(err, "Could not check the status right now."));
    } finally {
      setChecking("");
    }
    await load();
  };

  const attention = payments.filter((p) => p.status === "PROCESSING" || p.status === "UNKNOWN");

  return (
    <div>
      <div className="row">
        <h2 style={{ margin: 0 }}>Dashboard</h2>
        <button onClick={load} disabled={loading}>{loading ? "Refreshing..." : "Refresh"}</button>
      </div>

      {error && <p className="error">{error}</p>}

      {account && (
        <>
          <p>Account: {account.masked_account_number}</p>
          <div className="balance">₹ {inr(account.balance)}</div>
        </>
      )}

      {attention.length > 0 && (
        <div className="banner warn">
          <strong>Payments needing attention</strong>
          <table>
            <tbody>
              {attention.map((p) => (
                <tr key={p.idempotency_key}>
                  <td>To {p.recipient_id}</td>
                  <td>₹ {inr(p.amount)}</td>
                  <td><StatusBadge status={p.status} /></td>
                  <td>
                    <button disabled={checking === p.idempotency_key} onClick={() => check(p.idempotency_key)}>
                      {checking === p.idempotency_key ? "Checking..." : "Check status"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p style={{ marginBottom: 0 }}>Please do not pay again until these are confirmed.</p>
        </div>
      )}

      <h3>Recent transactions</h3>
      {txns.length === 0 ? (
        <p>No transactions yet.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>ID</th><th>Party</th><th>Amount</th><th>Date</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            {txns.map((t) => (
              <tr key={t.transaction_id}>
                <td>{t.transaction_id}</td>
                <td>{t.direction === "DEBIT" ? "To" : "From"} {t.counterparty_id}</td>
                <td className={t.direction === "DEBIT" ? "debit" : "credit"}>
                  {t.direction === "DEBIT" ? "-" : "+"}₹ {inr(t.amount)}
                </td>
                <td>{new Date(t.created_at).toLocaleString("en-IN")}</td>
                <td><StatusBadge status={t.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}