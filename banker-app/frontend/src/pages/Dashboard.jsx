/**
 * Dashboard page (Overview).
 *
 * Centralized dashboard displaying key banking metrics,
 * recent activity, service health overview, and quick actions.
 *
 * Uses the shared BankerContext so active alert counts and
 * recent activity stay in sync with failure injection/recovery.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  ArrowRightLeft,
  IndianRupee,
  CheckCircle2,
  XCircle,
  Network,
  AlertTriangle,
  ArrowRightLeft as ArrowIcon,
  Users as UsersIcon,
  Activity,
} from 'lucide-react';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import { useBanker, computeDashboardStats } from '../context/BankerContext';

export default function Dashboard() {
  const navigate = useNavigate();
  const { state } = useBanker();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setStats(computeDashboardStats(state));
    setLoading(false);
  }, [state]);

  if (loading) {
    return (
      <div className="page-content">
        <div className="loading-center">
          <div className="spinner" />
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-content fade-in">
      {/* Stats Grid */}
      <section className="stats-grid">
        <StatCard
          title="Total Customers"
          value={stats?.totalCustomers ?? 0}
          icon={Users}
          accent="cyan"
        />
        <StatCard
          title="Total Transactions"
          value={stats?.totalTransactions ?? 0}
          icon={ArrowRightLeft}
          accent="blue"
        />
        <StatCard
          title="Transaction Volume"
          value={stats?.totalVolume ?? '₹0'}
          icon={IndianRupee}
          accent="green"
        />
        <StatCard
          title="Successful"
          value={stats?.successfulTransactions ?? 0}
          icon={CheckCircle2}
          accent="green"
        />
        <StatCard
          title="Failed"
          value={stats?.failedTransactions ?? 0}
          icon={XCircle}
          accent="red"
        />
        <StatCard
          title="Pending"
          value={stats?.pendingTransactions ?? 0}
          icon={Activity}
          accent="amber"
        />
        <StatCard
          title="Active Alerts"
          value={stats?.activeAlerts ?? 0}
          icon={AlertTriangle}
          accent="amber"
        />
      </section>

      <div className="dashboard-grid">
        {/* Service Health Overview */}
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h3>Service Health Overview</h3>
              <p>Real-time infrastructure status</p>
            </div>
            <button
              className="btn btn-sm btn-outline"
              onClick={() => navigate('/infrastructure')}
            >
              View All <ArrowIcon size={14} />
            </button>
          </div>
          <div className="health-list">
            {state.infrastructureServices.map((service) => (
              <div key={service.id} className="health-item">
                <div className="health-item-info">
                  <span className="health-item-name">{service.name}</span>
                  <span className="health-item-detail">
                    {service.latency}ms · {service.availability}%
                  </span>
                </div>
                <StatusBadge status={service.status} />
              </div>
            ))}
          </div>
        </section>

        {/* Recent Activity */}
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h3>Recent Activity</h3>
              <p>Latest banking events</p>
            </div>
          </div>
          <div className="activity-list">
            {stats?.recentActivity?.map((act) => (
              <div key={act.id} className="activity-item">
                <div className="activity-icon">
                  {act.type === 'customer_created' && <UsersIcon size={16} />}
                  {act.type === 'transaction' && <Activity size={16} />}
                  {act.type === 'alert' && <AlertTriangle size={16} />}
                </div>
                <div className="activity-content">
                  <span className="activity-message">{act.message}</span>
                  <span className="activity-time">{act.time}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Quick Actions */}
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h3>Quick Actions</h3>
              <p>Common administrative tasks</p>
            </div>
          </div>
          <div className="quick-actions">
            <button className="btn btn-primary" onClick={() => navigate('/customers')}>
              <UsersIcon size={18} /> Manage Customers
            </button>
            <button className="btn btn-outline" onClick={() => navigate('/transactions')}>
              <ArrowRightLeft size={18} /> View Transactions
            </button>
            <button className="btn btn-outline" onClick={() => navigate('/infrastructure')}>
              <Network size={18} /> Infrastructure
            </button>
            <button className="btn btn-outline-danger" onClick={() => navigate('/failure-simulator')}>
              <AlertTriangle size={18} /> Failure Simulator
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
