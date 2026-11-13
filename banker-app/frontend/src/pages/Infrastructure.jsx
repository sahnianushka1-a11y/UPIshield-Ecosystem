/**
 * Infrastructure page — real-time service health monitoring.
 *
 * Uses the real backend API via infrastructureService.
 */

import { useState, useEffect } from 'react';
import { getInfrastructureHealth } from '../services/infrastructureService';
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
  const [services, setServices] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadServices();
  }, []);

  async function loadServices() {
    setLoading(true);
    setLoadError('');
    try {
      const data = await getInfrastructureHealth();
      setServices(data);
    } catch (error) {
      console.error('Failed to load infrastructure:', error);
      setLoadError('Unable to load infrastructure status. Start the Banker backend on port 8001 and retry.');
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="page-content"><div className="loading-center"><div className="spinner" /><p>Loading infrastructure status...</p></div></div>;

  return (
    <div className="page-content fade-in">
      <div className="page-header">
        <div><h2>Infrastructure Monitoring</h2><p>Real-time health of all banking services</p></div>
      </div>
      {loadError && (
        <div className="message-banner message-error">
          {loadError}
          <button className="btn btn-sm btn-outline" style={{ marginLeft: 12 }} onClick={loadServices}>Retry</button>
        </div>
      )}
      {!loading && !loadError && services.length === 0 && (
        <section className="panel"><div className="no-failures"><p>No infrastructure services are available.</p></div></section>
      )}
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
