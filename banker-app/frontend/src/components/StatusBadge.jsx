/**
 * StatusBadge component.
 *
 * Displays a colored badge indicating the status of an entity.
 * Supports common statuses: OPERATIONAL, DEGRADED, DOWN, ACTIVE,
 * INACTIVE, SUCCESS, FAILED, PENDING, PROCESSING, UNKNOWN, RECOVERING.
 */

const statusStyles = {
  OPERATIONAL: { bg: 'rgba(34,197,94,0.15)', color: '#22c55e', dot: '#22c55e' },
  DEGRADED: { bg: 'rgba(245,158,11,0.15)', color: '#f59e0b', dot: '#f59e0b' },
  DOWN: { bg: 'rgba(239,68,68,0.15)', color: '#ef4444', dot: '#ef4444' },
  RECOVERING: { bg: 'rgba(59,130,246,0.15)', color: '#3b82f6', dot: '#3b82f6' },
  ACTIVE: { bg: 'rgba(34,197,94,0.15)', color: '#22c55e', dot: '#22c55e' },
  INACTIVE: { bg: 'rgba(100,116,139,0.15)', color: '#94a3b8', dot: '#94a3b8' },
  SUCCESS: { bg: 'rgba(34,197,94,0.15)', color: '#22c55e', dot: '#22c55e' },
  FAILED: { bg: 'rgba(239,68,68,0.15)', color: '#ef4444', dot: '#ef4444' },
  PENDING: { bg: 'rgba(245,158,11,0.15)', color: '#f59e0b', dot: '#f59e0b' },
  PROCESSING: { bg: 'rgba(59,130,246,0.15)', color: '#3b82f6', dot: '#3b82f6' },
  UNKNOWN: { bg: 'rgba(148,163,184,0.15)', color: '#94a3b8', dot: '#94a3b8' },
};

export default function StatusBadge({ status, size = 'sm' }) {
  const style = statusStyles[status] || {
    bg: 'rgba(100,116,139,0.15)',
    color: '#94a3b8',
    dot: '#94a3b8',
  };

  const sizes = {
    sm: { dot: 6, padding: '3px 10px', fontSize: '11px' },
    md: { dot: 7, padding: '5px 14px', fontSize: '12px' },
    lg: { dot: 8, padding: '6px 18px', fontSize: '13px' },
  };

  const s = sizes[size] || sizes.sm;

  return (
    <span
      className="status-badge"
      style={{
        background: style.bg,
        color: style.color,
        padding: s.padding,
        fontSize: s.fontSize,
      }}
    >
      <span
        className="status-dot"
        style={{
          width: s.dot,
          height: s.dot,
          backgroundColor: style.dot,
        }}
      />
      {status}
    </span>
  );
}
