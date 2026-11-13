/**
 * Customers page — list, search, filter, create, toggle status, and view details.
 *
 * Uses the real backend API via customerService.
 */

import { useState, useMemo, useEffect } from 'react';
import { getAllCustomers, createCustomer, updateCustomerStatus } from '../services/customerService';
import StatusBadge from '../components/StatusBadge';
import { Search, Plus, X, Eye, Phone, Mail, Calendar, IndianRupee, UserRound } from 'lucide-react';

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPhone(phone) {
  return /^\+?[\d\s\-()]{8,15}$/.test(phone);
}

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formDeposit, setFormDeposit] = useState('');
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    loadCustomers();
  }, []);

  async function loadCustomers() {
    setLoading(true);
    try {
      const data = await getAllCustomers();
      setCustomers(data);
    } catch (err) {
      console.error('Failed to load customers:', err);
      setMessage({ type: 'error', text: 'Failed to load customers. Is the backend running?' });
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    let result = customers;
    if (statusFilter !== 'ALL') result = result.filter((c) => c.status === statusFilter);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((c) => c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || c.account_number.toLowerCase().includes(q) || c.phone.includes(q));
    }
    return result;
  }, [customers, search, statusFilter]);

  const handleCreate = async (e) => {
    e.preventDefault();
    const errors = {};
    if (!formName.trim()) errors.name = 'Name is required.';
    if (!formEmail.trim()) errors.email = 'Email is required.';
    else if (!isValidEmail(formEmail)) errors.email = 'Invalid email format.';
    if (!formPhone.trim()) errors.phone = 'Phone is required.';
    else if (!isValidPhone(formPhone)) errors.phone = 'Invalid phone number.';
    if (!formDeposit || Number(formDeposit) < 0) errors.deposit = 'Initial deposit must be 0 or more.';
    if (Object.keys(errors).length > 0) { setFormErrors(errors); return; }
    try {
      const newCustomer = await createCustomer({ name: formName.trim(), email: formEmail.trim(), phone: formPhone.trim(), initialDeposit: Number(formDeposit) });
      setCustomers((prev) => [newCustomer, ...prev]);
      setMessage({ type: 'success', text: `Customer ${newCustomer.name} created successfully!` });
      setFormName(''); setFormEmail(''); setFormPhone(''); setFormDeposit('');
      setFormErrors({}); setShowCreateForm(false);
    } catch {
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Failed to create customer.' });
    }
  };

  const handleToggleStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await updateCustomerStatus(id, newStatus);
      setCustomers((prev) => prev.map((c) => c.id === id ? { ...c, status: newStatus } : c));
      setMessage({ type: 'success', text: `Customer ${newStatus.toLowerCase()} successfully.` });
    } catch {
      setMessage({ type: 'error', text: 'Failed to update customer status.' });
    }
  };

  const handleCloseModal = () => { setSelectedCustomer(null); };

  if (loading) return <div className="page-content"><div className="loading-center"><div className="spinner" /><p>Loading customers...</p></div></div>;

  return (
    <div className="page-content fade-in">
      <div className="page-header">
        <div><h2>Customer Management</h2><p>Register, view, and manage simulated bank customers</p></div>
        <button className="btn btn-primary" onClick={() => setShowCreateForm(!showCreateForm)}><Plus size={18} /> New Customer</button>
      </div>

      {showCreateForm && (
        <section className="panel fade-in">
          <div className="panel-heading"><h3><Plus size={18} style={{ marginRight: 8 }} /> Create New Customer</h3></div>
          <form onSubmit={handleCreate} className="create-form">
            <div className="form-row">
              <div className="form-group">
                <label>Full Name</label>
                <input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="e.g. Rahul Sharma" />
                {formErrors.name && <span className="field-error">{formErrors.name}</span>}
              </div>
              <div className="form-group">
                <label>Email</label>
                <input type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} placeholder="e.g. rahul@example.com" />
                {formErrors.email && <span className="field-error">{formErrors.email}</span>}
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Phone Number</label>
                <input value={formPhone} onChange={(e) => setFormPhone(e.target.value)} placeholder="e.g. +91 98765 43210" />
                {formErrors.phone && <span className="field-error">{formErrors.phone}</span>}
              </div>
              <div className="form-group">
                <label>Initial Deposit (₹)</label>
                <input type="number" value={formDeposit} onChange={(e) => setFormDeposit(e.target.value)} placeholder="e.g. 5000" min="0" />
                {formErrors.deposit && <span className="field-error">{formErrors.deposit}</span>}
              </div>
            </div>
            <div className="form-actions">
              <button type="submit" className="btn btn-primary">Create Customer</button>
              <button type="button" className="btn btn-outline" onClick={() => setShowCreateForm(false)}>Cancel</button>
            </div>
          </form>
        </section>
      )}

      {message.text && <div className={`message-banner ${message.type === 'success' ? 'message-success' : 'message-error'}`}>{message.text}</div>}

      <div className="filters-bar">
        <div className="search-bar"><Search size={18} /><input placeholder="Search by name, email, account, or phone..." value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        <div className="filter-select">
          <label>Status</label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="ALL">All</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>
      </div>

      <section className="panel">
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr><th>Customer</th><th>Account</th><th>Balance</th><th>Phone</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan="6" style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-muted)' }}>{search || statusFilter !== 'ALL' ? 'No matching customers found.' : 'No customers registered yet.'}</td></tr>
              ) : (
                filtered.map((c) => (
                  <tr key={c.id}>
                    <td><div className="customer-cell"><div className="customer-avatar">{c.name.charAt(0)}</div><div><strong>{c.name}</strong><span>{c.email}</span></div></div></td>
                    <td><code>{c.account_number}</code></td>
                    <td>₹{c.balance.toLocaleString('en-IN')}</td>
                    <td>{c.phone}</td>
                    <td><StatusBadge status={c.status} /></td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <button className="btn btn-sm btn-outline" onClick={() => setSelectedCustomer(c)} title="View Details"><Eye size={14} /></button>
                        <button className="btn btn-sm btn-outline" onClick={() => handleToggleStatus(c.id, c.status)} title={c.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}>{c.status === 'ACTIVE' ? <X size={16} /> : <Plus size={16} />}</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {selectedCustomer && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Customer Details</h3>
              <button className="modal-close" onClick={handleCloseModal}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <div className="customer-detail-grid">
                <div className="detail-card">
                  <div className="detail-icon"><Eye size={20} /></div>
                  <div className="detail-info"><span className="detail-label">Full Name</span><span className="detail-value">{selectedCustomer.name}</span></div>
                </div>
                <div className="detail-card">
                  <div className="detail-icon"><Mail size={20} /></div>
                  <div className="detail-info"><span className="detail-label">Email</span><span className="detail-value">{selectedCustomer.email}</span></div>
                </div>
                <div className="detail-card">
                  <div className="detail-icon"><Phone size={20} /></div>
                  <div className="detail-info"><span className="detail-label">Phone</span><span className="detail-value">{selectedCustomer.phone}</span></div>
                </div>
                <div className="detail-card">
                  <div className="detail-icon"><IndianRupee size={20} /></div>
                  <div className="detail-info"><span className="detail-label">Account Number</span><span className="detail-value"><code>{selectedCustomer.account_number}</code></span></div>
                </div>
                <div className="detail-card">
                  <div className="detail-icon"><IndianRupee size={20} /></div>
                  <div className="detail-info"><span className="detail-label">Balance</span><span className="detail-value" style={{ color: 'var(--color-success)' }}>₹{selectedCustomer.balance.toLocaleString('en-IN')}</span></div>
                </div>
                <div className="detail-card">
                  <div className="detail-icon"><Calendar size={20} /></div>
                  <div className="detail-info"><span className="detail-label">Created</span><span className="detail-value">{selectedCustomer.created_at}</span></div>
                </div>
                <div className="detail-card">
                  <div className="detail-icon"><StatusBadge status={selectedCustomer.status} /></div>
                  <div className="detail-info"><span className="detail-label">Status</span><span className="detail-value"><StatusBadge status={selectedCustomer.status} size="md" /></span></div>
                </div>
                <div className="detail-card">
                  <div className="detail-icon"><UserRound size={20} /></div>
                  <div className="detail-info"><span className="detail-label">Customer ID</span><span className="detail-value"><code>{selectedCustomer.id}</code></span></div>
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
