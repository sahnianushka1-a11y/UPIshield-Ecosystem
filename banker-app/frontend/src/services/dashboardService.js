/**
 * Dashboard mock API.
 * Provides simulated statistics for the Banker overview dashboard.
 *
 * The hook version reads from the shared BankerContext so that
 * active alert counts and recent activity stay in sync with
 * failure injection/recovery.
 */

import { useBanker, computeDashboardStats } from '../context/BankerContext';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Hook version — returns live dashboard stats from shared state.
 * Re-renders when the state changes.
 */
export function useDashboardStats() {
  const { state } = useBanker();
  return computeDashboardStats(state);
}

/**
 * Static version — returns initial mock stats.
 * Used by pages that fetch on mount before context is available.
 */
export const getDashboardStats = async () => {
  await delay(600);
  return {
    totalCustomers: 1284,
    totalTransactions: 8432,
    totalVolume: '₹2,45,80,000',
    successfulTransactions: 7891,
    failedTransactions: 541,
    infrastructureHealth: 'OPERATIONAL',
    activeAlerts: 3,
    recentActivity: [
      { id: 'act-1', type: 'customer_created', message: 'New customer R. Sharma registered', time: '2 min ago' },
      { id: 'act-2', type: 'transaction', message: 'UPI transfer ₹12,500 completed', time: '5 min ago' },
      { id: 'act-3', type: 'alert', message: 'API latency spike on Payment Gateway', time: '12 min ago' },
      { id: 'act-4', type: 'customer_created', message: 'New customer A. Patel registered', time: '18 min ago' },
      { id: 'act-5', type: 'transaction', message: 'NEFT transfer ₹45,000 processed', time: '25 min ago' },
    ],
  };
};

