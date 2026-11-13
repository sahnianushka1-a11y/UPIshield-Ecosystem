/**
 * Transaction mock API.
 * Provides simulated transaction data with filtering support.
 *
 * All data comes from the shared BankerContext state,
 * so transactions are visible across all pages.
 */

import { useBanker } from '../context/BankerContext';

/* ============================================================
   HOOK VERSION — for use inside components
   ============================================================ */

export function useTransactions() {
  const { getTransactions } = useBanker();
  const transactions = getTransactions();

  const getAll = (filters = {}) => {
    let filtered = [...transactions];
    if (filters.status) {
      filtered = filtered.filter((t) => t.status === filters.status);
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.id.toLowerCase().includes(q) ||
          (t.sender || '').toLowerCase().includes(q) ||
          (t.receiver || '').toLowerCase().includes(q) ||
          (t.senderAccount || '').toLowerCase().includes(q) ||
          (t.receiverAccount || '').toLowerCase().includes(q)
      );
    }
    return filtered;
  };

  const getById = (id) => transactions.find((t) => t.id === id) || null;

  return { transactions, getAll, getById };
}

/* ============================================================
   STATIC VERSION — for backward compatibility
   In production these would be HTTP calls to the backend.
   ============================================================ */

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Returns all transactions from the shared context state.
 */
export const getAllTransactions = async (filters = {}) => {
  await delay(700);
  // In production: const res = await api.get('/transactions', { params: filters });
  // For now, we return a placeholder. The Transactions page uses
  // the hook version which has live state.
  return [];
};

/**
 * Returns a single transaction by ID.
 */
export const getTransactionById = async (id) => {
  await delay(400);
  return null;
};
