/**
 * Transaction service — communicates with the Bank backend.
 *
 * Uses the centralized api.js axios instance.
 * All requests go to VITE_BANK_API_URL (http://localhost:8001).
 */

import api from './api';

/**
 * Returns all transactions, optionally filtered by status and search.
 */
export const getAllTransactions = async (filters = {}) => {
  const params = {};
  if (filters.status) params.status = filters.status;
  if (filters.search) params.search = filters.search;
  if (filters.date) params.date = filters.date;
  const res = await api.get('/transactions/', { params });
  return res.data;
};

/**
 * Returns a single transaction by ID.
 */
export const getTransactionById = async (id) => {
  const res = await api.get(`/transactions/${id}`);
  return res.data;
};

