/**
 * Transactions page — list, search, filter, and view details.
 *
 * Uses the real backend API via transactionService.
 */

import { useState, useMemo, useEffect } from 'react';
import { getAllTransactions } from '../services/transactionService';
import StatusBadge from '../components/StatusBadge';
import { Search, Filter, X, Eye, IndianRupee, Clock, Route, AlertCircle, UserRound } from 'lucide-react';

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('');
  const [selectedTransaction, setSelectedTransaction] = useState(null);

  useEffect(() => {
    loadTransactions();
  }, []);

  async function loadTransactions() {
    setLoading(true);
    try {
      const data = await getAllTransactions();
      setTransactions(data);
    } catch (err) {
      console.error('Failed to load transactions:', err);
    } finally {
      setLoading(false);
    }
  }

  const statusCounts = useMemo(() => {
    const counts = { ALL: transactions.length, SUCCESS: 0, FAILED: 0, PENDING: 0, PROCESSING: 0, UNKNOWN: 0 };
    transactions.forEach((t) => { if (counts[t.status] !== undefined) counts[t.status]++; });
    return counts;
  }, [transactions]);

  const filtered = useMemo(() => {
    let result = transactions;
    if (statusFilter !== 'ALL') result = result.filter((t) => t.status === statusFilter);
    if (dateFilter) result = result.filter((t) => t.timestamp.startsWith(dateFilter));
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((t) => t.id.toLowerCase().includes(q) || (t.sender || '').toLowerCase().includes(q) || (t.receiver || '').toLowerCase().includes(q) || (t.sender_account || '').toLowerCase().includes(q) || (t.receiver_account || '').toLowerCase().includes(q));
    }
    return result;
  }, [transactions, search, statusFilter, dateFilter]);

  const handleCloseModal = () => { setSelectedTransaction(null); };

  if (loading) return <div className="page-content"><div className="loading-center"><div className="spinner" /><p>Loading transactions...</p></div></div>;

  return (
    <div className="page-content fade-in">
      <div className="page-header">
        <div><h2>Transaction Monitoring</h2><p>View and track simulated payment transactions</p></div>
      </div>

      <section className="panel" style={{ marginBottom: 16 }}>
        <div className="status-summary">
          <div className="status-summary-item"><span className="status-summary-count">{statusCounts.ALL}</span><span className="status-summary-label">Total</span></div>
          <div className="status-summary-item success"><span className="status-summary-count">{statusCounts.SUCCESS}</span><span className="status-summary-label">Success</span></div>
          <div className="status-summary-item failed"><span className="status-summary-count">{statusCounts.FAILED}</span><span className="status-summary-label">Failed</span></div>
          <div className="status-summary-item pending"><span className="status-summary-count">{statusCounts.PENDING}</span><span className="status-summary-label">Pending</span></div>
          <div className="status-summary-item processing"><span className="status-summary-count">{statusCounts.PROCESSING}</span><span className="status-summary-label">Processing</span></div>
          <div className="status-summary-item unknown"><span className="status-summary-count">{statusCounts.UNKNOWN}</span><span className="status-summary-label">Unknown</span></div>
        </div>
      </section>

      <div className="filters-bar">
        <div className="search-bar"><Search size={18} /><input placeholder="Search by TXN ID, sender, or receiver..." value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        <div className="filter-select">
          <Filter size={16} />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="ALL">All Status</option>
            <option value="SUCCESS">SUCCESS</option>
            <option value="PENDING">PENDING</option>
            <option value="PROCESSING">PROCESSING</option>
            <option value="FAILED">FAILED</option>
            <option value="UNKNOWN">UNKNOWN</option>
          </select>
        </div>
        <label className="filter-select">
          <span>Date</span>
          <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} />
        </label>
      </div>

      <section className="panel">
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead><tr><th>TXN ID</th><th>Sender</th><th>Receiver</th><th>Amount</th><th>Route</th><th>Status</th><th>Time</th><th>Failure</th><th></th></tr></thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan="9" style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-muted)' }}>{transactions.length === 0 ? 'No simulated transactions available.' : 'No transactions match the selected filters.'}</td></tr>
              ) : (
                filtered.map((t) => (
                  <tr key={t.id}>
                    <td><code>{t.id}</code></td>
                    <td><span title={t.sender_account}>{t.sender || t.sender_account}</span></td>
                    <td><span title={t.receiver_account}>{t.receiver || t.receiver_account}</span></td>
                    <td>₹{t.amount.toLocaleString('en-IN')}</td>
                    <td>{t.route}</td>
                    <td><StatusBadge status={t.status} /></td>
                    <td style={{ fontSize: 12 }}>{t.timestamp}</td>
                    <td>{t.failure_reason ? <span style={{ color: 'var(--color-danger)', fontSize: 12 }}>{t.failure_reason}</span> : <span style={{ color: 'var(--color-text-muted)' }}>—</span>}</td>
                    <td><button className="btn btn-sm btn-outline" onClick={() => setSelectedTransaction(t)} title="View Details"><Eye size={14} /></button></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
      {selectedTransaction && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Transaction Details</h3>
              <button className="modal-close" onClick={handleCloseModal}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <div className="customer-detail-grid">
                <div className="detail-card">
                  <div className="detail-icon"><Eye size={20} /></div>
                  <div className="detail-info"><span className="detail-label">Transaction ID</span><span className="detail-value"><code>{selectedTransaction.id}</code></span></div>
                </div>
                <div className="detail-card">
                  <div className="detail-icon"><IndianRupee size={20} /></div>
                  <div className="detail-info"><span className="detail-label">Amount</span><span className="detail-value" style={{ color: 'var(--color-success)' }}>₹{selectedTransaction.amount.toLocaleString('en-IN')}</span></div>
                </div>
                <div className="detail-card">
                  <div className="detail-icon"><StatusBadge status={selectedTransaction.status} /></div>
                  <div className="detail-info"><span className="detail-label">Status</span><span className="detail-value"><StatusBadge status={selectedTransaction.status} size="md" /></span></div>
                </div>
                <div className="detail-card">
                  <div className="detail-icon"><Route size={20} /></div>
                  <div className="detail-info"><span className="detail-label">Payment Route</span><span className="detail-value">{selectedTransaction.route}</span></div>
                </div>
                <div className="detail-card">
                  <div className="detail-icon"><Clock size={20} /></div>
                  <div className="detail-info"><span className="detail-label">Timestamp</span><span className="detail-value">{selectedTransaction.timestamp}</span></div>
                </div>
                <div className="detail-card">
                  <div className="detail-icon"><UserRound size={20} /></div>
                  <div className="detail-info"><span className="detail-label">Sender</span><span className="detail-value"><strong>{selectedTransaction.sender}</strong><br /><code>{selectedTransaction.sender_account}</code></span></div>
                </div>
                <div className="detail-card">
                  <div className="detail-icon"><UserRound size={20} /></div>
                  <div className="detail-info"><span className="detail-label">Receiver</span><span className="detail-value"><strong>{selectedTransaction.receiver}</strong><br /><code>{selectedTransaction.receiver_account}</code></span></div>
                </div>
                <div className="detail-card">
                  <div className="detail-icon"><AlertCircle size={20} /></div>
                  <div className="detail-info"><span className="detail-label">Failure Reason</span><span className="detail-value" style={{ color: selectedTransaction.failure_reason ? 'var(--color-danger)' : 'var(--color-text-muted)' }}>{selectedTransaction.failure_reason || 'None'}</span></div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={handleCloseModal}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}