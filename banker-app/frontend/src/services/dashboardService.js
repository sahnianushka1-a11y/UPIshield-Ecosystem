/**
 * Dashboard service — communicates with the Bank backend.
 *
 * Uses the centralized api.js axios instance.
 * All requests go to VITE_BANK_API_URL (http://localhost:8001).
 */

import api from './api';

/**
 * Returns aggregated dashboard statistics.
 */
export const getDashboardStats = async () => {
  const res = await api.get('/dashboard/summary');
  const data = res.data;
  return {
    totalCustomers: data.total_customers,
    totalTransactions: data.total_transactions,
    totalVolume: data.total_volume.replace(/^Rs\./, '₹'),
    successfulTransactions: data.successful_transactions,
    failedTransactions: data.failed_transactions,
    pendingTransactions: data.pending_transactions,
    infrastructureHealth: data.infrastructure_health,
    activeAlerts: data.active_alerts,
    recentActivity: data.recent_activity.map((activity) => ({
      ...activity,
      type: activity.event_type,
    })),
  };
};


