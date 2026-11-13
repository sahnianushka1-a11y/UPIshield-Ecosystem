/**
 * Topbar component.
 *
 * Fixed top navigation bar showing the current page title,
 * a live clock, and a status indicator.
 */

import { useState, useEffect } from 'react';
import { Bell, RefreshCw } from 'lucide-react';

export default function Topbar({ pageTitle }) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="topbar">
      <div className="topbar-left">
        <h1 className="topbar-title">{pageTitle}</h1>
      </div>
      <div className="topbar-right">
        <span className="topbar-time">
          {time.toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })}
        </span>
        <button className="topbar-icon-btn" title="Refresh data">
          <RefreshCw size={18} />
        </button>
        <button className="topbar-icon-btn" title="Notifications">
          <Bell size={18} />
          <span className="topbar-badge">3</span>
        </button>
      </div>
    </header>
  );
}
