const COLORS = {
  SUCCESS: "#1b7f3b",
  FAILED: "#b00020",
  PROCESSING: "#b36b00",
  UNKNOWN: "#6b4fbb",
};

export default function StatusBadge({ status }) {
  return (
    <span className="badge" style={{ background: COLORS[status] || "#555" }}>
      {status}
    </span>
  );
}
