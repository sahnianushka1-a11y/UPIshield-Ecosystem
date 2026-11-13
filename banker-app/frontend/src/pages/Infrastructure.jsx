/**
 * Infrastructure page — real-time service health monitoring.
 *
 * Consumes the shared BankerContext so injected failures
 * are immediately reflected here.
 */

import { useBanker } from '../context/BankerContext';
import StatusBadge from '../components/StatusBadge';
import { Network, Activity, Database, Zap, Globe } from 'lucide-react';

const iconMap = {
  'payment-api': Zap,
  'auth-api': Activity,
  'bank-db': Database,
  'upi-gateway': Network,
  'payment-processor': Zap,
  'external-payments': Globe,
};

export default function Infrastructure() {
  const { state } = useBanker();
  const services = state.infrastructureServices;

  return (
    <div className="page-content fade-in">
      <div className="page-header">
        <div><h2>Infrastructure Monitoring</h2><p>Real-time health of all banking services</p></div>
      </div>
      <div className="infra-grid">
        {services.map((s) => {
          const Icon = iconMap[s.id] || Network;
          return (
            <div key={s.id} className="infra-card">
              <div className="infra-card-header">
                <div className="infra-icon"><Icon size={22} /></div>
                <StatusBadge status={s.status} size="md" />
              </div>
              <h4 style={{ marginTop: 12 }}>{s.name}</h4>
              <div className="infra-stats">
                <div className="infra-stat"><span className="infra-stat-label">Latency</span><span className="infra-stat-value">{s.latency}ms</span></div>
                <div className="infra-stat"><span className="infra-stat-label">Availability</span><span className="infra-stat-value">{s.availability}%</span></div>
                <div className="infra-stat"><span className="infra-stat-label">Updated</span><span className="infra-stat-value">{new Date(s.lastUpdate).toLocaleTimeString()}</span></div>
              </div>
              {s.failureInfo && <div className="infra-failure"><strong>Issue:</strong> {s.failureInfo}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
