/**
 * Failure Simulator page — inject and recover simulated failures.
 *
 * Uses the real backend API via failureService.
 */

import { useState, useEffect } from 'react';
import { getFailureStatus, injectFailure, recoverService } from '../services/failureService';
import { AlertTriangle, RotateCcw, Zap, Server, CheckCircle2 } from 'lucide-react';

const failureTypes = ['API_TIMEOUT', 'API_UNAVAILABLE', 'SERVER_ERROR', 'NETWORK_INTERRUPTION', 'RESPONSE_LOST'];

const serviceLabels = {
  'payment-api': 'Payment API',
  'auth-api': 'Authentication API',
  'bank-db': 'Bank Database',
  'upi-gateway': 'UPI Gateway',
  'payment-processor': 'Payment Processing Service',
  'external-payments': 'External Payment Dependencies',
};

export default function FailureSimulator() {
  const [activeFailures, setActiveFailures] = useState([]);
  const [allServices, setAllServices] = useState([]);
  const [selectedService, setSelectedService] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStatus();
  }, []);

  async function loadStatus() {
    setLoading(true);
    setLoadError('');
    try {
      const data = await getFailureStatus();
      setAllServices(data.all_services);
      setActiveFailures(data.active_failures);
    } catch (error) {
      console.error('Failed to load failure status:', error);
      setLoadError('Unable to load services. Start the Banker backend on port 8001 and retry.');
    } finally {
      setLoading(false);
    }
  }

  const handleInject = async () => {
    if (!selectedService || !selectedType) {
      setMessage({ type: 'error', text: 'Please select a service and failure type.' });
      return;
    }
    try {
      await injectFailure(selectedService, selectedType);
      setMessage({ type: 'success', text: `Simulated ${selectedType} injected on ${serviceLabels[selectedService] || selectedService}.` });
      await loadStatus();
      setSelectedService('');
      setSelectedType('');
    } catch {
      setMessage({ type: 'error', text: 'Failed to inject failure.' });
    }
  };

  const handleRecover = async (failureId) => {
    try {
      await recoverService(failureId);
      setMessage({ type: 'success', text: `Service recovered.` });
      loadStatus();
    } catch {
      setMessage({ type: 'error', text: 'Failed to recover service.' });
    }
  };

  if (loading) return <div className="page-content"><div className="loading-center"><div className="spinner" /><p>Loading failure status...</p></div></div>;

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
      {loadError && (
        <div className="message-banner message-error">
          {loadError}
          <button className="btn btn-sm btn-outline" style={{ marginLeft: 12 }} onClick={loadStatus}>Retry</button>
        </div>
      )}

      <section className="panel">
        <div className="panel-heading"><h3><Zap size={18} style={{ marginRight: 8 }} /> Inject Failure</h3></div>
        <div className="simulator-controls">
          <div className="form-group">
            <label>Select Service</label>
            <select value={selectedService} onChange={(e) => setSelectedService(e.target.value)}>
              <option value="">-- Choose service --</option>
              {allServices.map((s) => <option key={s} value={s}>{serviceLabels[s] || s}</option>)}
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
                <div><strong>{f.service_name}</strong><span>{f.failure_type}</span></div>
                <button className="btn btn-sm btn-success" onClick={() => handleRecover(f.id)}><RotateCcw size={14} style={{ marginRight: 4 }} /> Recover</button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
