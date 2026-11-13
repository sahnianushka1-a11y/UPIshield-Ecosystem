/**
 * Sidebar component.
 *
 * Fixed left navigation panel with icons and route links.
 * Collapses to an icon-only bar on smaller screens.
 */

import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  ArrowRightLeft,
  Network,
  Zap,
  Settings,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import '../styles/global.css';

const navItems = [
  { label: 'Overview', path: '/', icon: LayoutDashboard },
  { label: 'Customers', path: '/customers', icon: Users },
  { label: 'Transactions', path: '/transactions', icon: ArrowRightLeft },
  { label: 'Infrastructure', path: '/infrastructure', icon: Network },
  { label: 'Failure Simulator', path: '/failure-simulator', icon: Zap },
  { label: 'Settings', path: '/settings', icon: Settings },
];

export default function Sidebar() {
  const { user, logout } = useAuth();

  return (
    <aside className="sidebar">
      {/* Brand */}
      <div className="sidebar-brand">
        <div className="sidebar-logo">
          <ShieldIcon />
        </div>
        <span className="sidebar-title">UPIShield</span>
        <span className="sidebar-subtitle">Bank Admin</span>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `sidebar-link${isActive ? ' sidebar-link-active' : ''}`
              }
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-avatar">
            {user?.name?.charAt(0) || 'A'}
          </div>
          <div className="sidebar-user-info">
            <span className="sidebar-user-name">{user?.name || 'Admin'}</span>
            <span className="sidebar-user-role">Administrator</span>
          </div>
        </div>
        <button onClick={logout} className="sidebar-logout" title="Logout">
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}

/* ---------- Small shield icon for the brand ---------- */
function ShieldIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 2L3 7V12C3 17.52 6.84 22.74 12 24C17.16 22.74 21 17.52 21 12V7L12 2Z"
        fill="url(#shieldGrad)"
        stroke="#06b6d4"
        strokeWidth="1.5"
      />
      <defs>
        <linearGradient id="shieldGrad" x1="3" y1="2" x2="21" y2="24">
          <stop stopColor="#1e3a5f" />
          <stop offset="1" stopColor="#0c2d48" />
        </linearGradient>
      </defs>
    </svg>
  );
}
