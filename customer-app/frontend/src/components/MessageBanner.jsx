const KIND = {
  PAYMENT_SUCCESSFUL: "ok",
  PAYMENT_PENDING: "warn",
  CONFIRMATION_NOT_RECEIVED: "warn",
  DUPLICATE_DETECTED: "info",
  PAYMENT_FAILED: "bad",
};

export default function MessageBanner({ code, message }) {
  if (!message) return null;
  return <div className={`banner ${KIND[code] || "info"}`}>{message}</div>;
}
