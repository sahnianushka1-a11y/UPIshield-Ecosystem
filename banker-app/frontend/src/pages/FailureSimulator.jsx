/**
 * Failure Simulator page — inject and recover simulated failures.
 *
 * Uses the shared BankerContext so failures are visible across
 * all pages (Infrastructure, Dashboard, etc.).
 */

import { useState } from 'react';
import { useBanker } from '../context/BankerContext';
import StatusBadge from '../components/StatusBadge';
import { AlertTriangle, RotateCcw, Zap, Server, CheckCircle2 } from 'lucide-react';

const failureTypes = ['API timeout', 'API unavailable', 'Server error', 'Network interruption', 'Response lost'];

const serviceLabels = {
  'payment-api': 'Payment API',
  'auth-api': 'Authentication API',
  'bank-db': 'Bank Database',
  'upi-gateway': 'UPI Gateway',
  'payment-processor': 'Payment Processing Service',
  'external-payments': 'External Payment Dependencies',
};

export default function FailureSimulator() {
  const { state, injectFailure: dispatchInject, recoverService: dispatchRecover } = useBanker();
  const [selectedService, setSelectedService] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });

  const services = state.infrastructureServices.map((s) => s.id);
  const activeFailures = state.activeFailures;

  const handleInject = () => {
    if (!selectedService || !selectedType) {
      setMessage({ type: 'error', text: 'Please select a service and failure type.' });
      return;
    }
    dispatchInject(selectedService, selectedType);
    setMessage({ type: 'success', text: `Simulated ${selectedType} injected on ${serviceLabels[selectedService] || selectedService}.` });
    setSelectedService('');
    setSelectedType('');
  };

  const handleRecover = (serviceId) => {
    dispatchRecover(serviceId);
    setMessage({ type: 'success', text: `${serviceLabels[serviceId] || serviceId} recovered.` });
  };

  return (
    <div className="page-content fade-in">
      <div className="page-header">
        <div><h2>Failure Simulator</h2><p>Inject controlled faults to test infrastructure resilience</p></div>
      </div>

      <div className="simulator-warning">
        <AlertTriangle size={20} />
        <div><strong>SIMULATED FAILURES ONLY</strong><span style={{ display: 'block', fontSize: 13, color: 'var(--color-text-secondary)' }}>All failures injected here are simulated and do not affect real banking operations.</span></div>
      </div>

      {message.text && <div className={`message-banner ${message.type === 'success' ? 'message-success' : 'message-error'}`}>{message.text}</div>}

      <section className="panel">
        <div className="panel-heading"><h3><Zap size={18} style={{ marginRight: 8 }} /> Inject Failure</h3></div>
        <div className="simulator-controls">
          <div className="form-group">
            <label>Select Service</label>
            <select value={selectedService} onChange={(e) => setSelectedService(e.target.value)}>
              <option value="">-- Choose service --</option>
              {services.map((s) => <option key={s} value={s}>{serviceLabels[s] || s}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Failure Type</label>
            <select value={selectedType} onChange={(e) => setSelectedType(e.target.value)}>
              <option value="">-- Choose type --</option>
              {failureTypes.map((ft) => <option key={ft} value={ft}>{ft}</option>)}
            </select>
          </div>
          <button className="btn btn-danger" onClick={handleInject} disabled={!selectedService || !selectedType}><AlertTriangle size={18} style={{ marginRight: 6 }} /> Inject Failure</button>
        </div>
      </section>

      <section className="panel">
        <div className="panel-heading"><h3><Server size={18} style={{ marginRight: 8 }} /> Active Failures</h3></div>
        {activeFailures.length === 0 ? (
          <div className="no-failures"><CheckCircle2 size={32} /><p>No active failures. All services are running normally.</p></div>
        ) : (
          <div className="failures-list">
            {activeFailures.map((f) => (
              <div key={f.id} className="failure-item">
                <div><strong>{f.serviceName}</strong><span>{f.failureType}</span></div>
                <button className="btn btn-sm btn-success" onClick={() => handleRecover(f.serviceId)}><RotateCcw size={14} style={{ marginRight: 4 }} /> Recover</button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
