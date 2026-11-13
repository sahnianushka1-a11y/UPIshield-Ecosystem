/**
 * Settings page — placeholder for future configuration options.
 */

import { useAuth } from '../context/AuthContext';
import { Settings as SettingsIcon, User, Bell, Shield, Key } from 'lucide-react';

export default function Settings() {
  const { user, logout } = useAuth();

  return (
    <div className="page-content fade-in">
      <div className="page-header">
        <div><h2>Settings</h2><p>Application and account configuration</p></div>
      </div>

      <div className="settings-grid">
        <section className="panel">
          <div className="panel-heading"><h3><User size={18} style={{ marginRight: 8 }} /> Account</h3></div>
          <div className="settings-item"><span className="settings-label">Administrator</span><span className="settings-value">{user?.name || 'Admin'}</span></div>
          <div className="settings-item"><span className="settings-label">Email</span><span className="settings-value">{user?.email || 'admin@bank.com'}</span></div>
          <div className="settings-item"><span className="settings-label">Role</span><span className="settings-value">Bank Administrator</span></div>
        </section>

        <section className="panel">
          <div className="panel-heading"><h3><Bell size={18} style={{ marginRight: 8 }} /> Notifications</h3></div>
          <p style={{ color: 'var(--color-text-muted)', padding: '12px 0' }}>Notification preferences will be available in a future update.</p>
        </section>

        <section className="panel">
          <div className="panel-heading"><h3><Shield size={18} style={{ marginRight: 8 }} /> Security</h3></div>
          <p style={{ color: 'var(--color-text-muted)', padding: '12px 0' }}>Security settings will be available in a future update.</p>
        </section>

        <section className="panel">
          <div className="panel-heading"><h3><Key size={18} style={{ marginRight: 8 }} /> API Configuration</h3></div>
          <div className="settings-item"><span className="settings-label">Backend URL</span><span className="settings-value" style={{ fontFamily: 'monospace' }}>{import.meta.env.VITE_BANK_API_URL || 'http://localhost:8001'}</span></div>
        </section>
      </div>

      <button className="btn btn-danger" onClick={logout} style={{ marginTop: 24 }}><SettingsIcon size={18} style={{ marginRight: 6 }} /> Sign Out</button>
    </div>
  );
}
