import { useRef, useState } from "react";
import api, { errorText } from "../api/client";
import MessageBanner from "../components/MessageBanner";
import StatusBadge from "../components/StatusBadge";

const newKey = () =>
  crypto.randomUUID
    ? crypto.randomUUID()
    : `k${Date.now()}${Math.random().toString(36).slice(2)}0000000`;

const EMPTY = { recipient: "", amount: "", description: "" };

export default function SendMoney({ isMock }) {
  const [form, setForm] = useState(EMPTY);
  const [key, setKey] = useState(newKey); // stays the same across retries/checks
  const [result, setResult] = useState(null);
  const [unconfirmed, setUnconfirmed] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false); // blocks double-clicks before React re-renders

  const open =
    unconfirmed || (result && (result.status === "PROCESSING" || result.status === "UNKNOWN"));
  const finished = result && (result.status === "SUCCESS" || result.status === "FAILED");
  const locked = busy || open || finished;

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    if (inFlight.current || locked) return;
    const amount = form.amount.trim();
    if (!form.recipient.trim() || !/^\d+(\.\d{1,2})?$/.test(amount) || Number(amount) <= 0) {
      setError("Enter a recipient and an amount greater than zero (up to 2 decimals).");
      return;
    }
    inFlight.current = true;
    setBusy(true);
    setError("");
    try {
      const { data } = await api.post("/api/payments", {
        idempotency_key: key,
        recipient_id: form.recipient.trim(),
        amount,
        description: form.description.trim(),
      });
      setResult(data);
    } catch (err) {
      const st = err.response?.status;
      if (st && ((st >= 400 && st < 500) || st === 501)) {
        // The server answered with a definite refusal: nothing was sent.
        setError(errorText(err));
        setKey(newKey());
      } else {
        // Timeout / network / 5xx: outcome unknown. Keep the SAME key. Do NOT assume failure.
        setUnconfirmed(true);
      }
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };

  const check = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError("");
    try {
      const { data } = await api.post(`/api/payments/${key}/refresh`);
      setResult(data);
      setUnconfirmed(false);
    } catch (err) {
      if (err.response?.status === 404) {
        setUnconfirmed(false);
        setError(
          "We have no record of this request, so it never reached our server and no money " +
            "was sent. You can safely submit it again."
        );
      } else {
        setError(errorText(err, "Could not check the status right now. Try again shortly."));
      }
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };

  const reset = () => {
    setForm(EMPTY);
    setKey(newKey());
    setResult(null);
    setUnconfirmed(false);
    setError("");
  };

  return (
    <div>
      <h2>Send Money</h2>

      <form onSubmit={submit}>
        <label>Recipient customer ID</label>
        <input value={form.recipient} onChange={set("recipient")} disabled={locked} placeholder="e.g. CUST1002" />
        <label>Amount (INR)</label>
        <input value={form.amount} onChange={set("amount")} disabled={locked} inputMode="decimal" placeholder="0.00" />
        <label>Description</label>
        <input value={form.description} onChange={set("description")} disabled={locked} maxLength={100} />
        <button type="submit" disabled={locked}>{busy ? "Please wait..." : "Send money"}</button>
      </form>

      {error && <p className="error">{error}</p>}

      {unconfirmed && (
        <MessageBanner
          code="CONFIRMATION_NOT_RECEIVED"
          message="We did not receive confirmation. Your payment may or may not have gone through. Please do not pay again. Use 'Check status' to find out."
        />
      )}

      {result && <MessageBanner code={result.message_code} message={result.message} />}

      {result && (
        <p>
          Status: <StatusBadge status={result.status} />
          {result.transaction_id && <> &nbsp; Transaction ID: <strong>{result.transaction_id}</strong></>}
        </p>
      )}

      {(result || unconfirmed) && <p className="hint">Request reference: {key}</p>}

      <div className="row">
        {open && <button onClick={check} disabled={busy}>Check status</button>}
        {finished && <button onClick={reset}>Make another payment</button>}
      </div>

      {isMock && (
        <div className="hint">
          <strong>Mock demo triggers</strong> (start the description with):{" "}
          <code>[fail]</code> declined, <code>[slow]</code> pending 8s, <code>[timeout]</code>{" "}
          processed but no reply, <code>[lost]</code> never reached the bank. Demo accounts:
          CUST1001 and CUST1002.
        </div>
      )}
    </div>
  );
}
