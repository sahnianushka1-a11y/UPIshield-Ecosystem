/**
 * StatCard component.
 *
 * Reusable card for displaying a single metric on the dashboard.
 * Accepts a title, value, icon, and optional color accent.
 */

export default function StatCard({ title, value, icon: Icon, accent = 'cyan' }) {
  const accentColors = {
    cyan: { bg: 'rgba(6,182,212,0.1)', border: 'rgba(6,182,212,0.3)', icon: '#06b6d4' },
    blue: { bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.3)', icon: '#3b82f6' },
    green: { bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.3)', icon: '#22c55e' },
    red: { bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.3)', icon: '#ef4444' },
    amber: { bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)', icon: '#f59e0b' },
    indigo: { bg: 'rgba(99,102,241,0.1)', border: 'rgba(99,102,241,0.3)', icon: '#6366f1' },
  };

  const colors = accentColors[accent] || accentColors.cyan;

  return (
    <div className="stat-card" style={{ borderTopColor: colors.icon }}>
      <div className="stat-card-header">
        <span className="stat-card-title">{title}</span>
        {Icon && (
          <div className="stat-card-icon" style={{ background: colors.bg, color: colors.icon }}>
            <Icon size={20} />
          </div>
        )}
      </div>
      <span className="stat-card-value">{value}</span>
    </div>
  );
}
