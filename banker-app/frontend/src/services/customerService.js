/**
 * Customer service — communicates with the Bank backend.
 *
 * Uses the centralized api.js axios instance.
 * All requests go to VITE_BANK_API_URL (http://localhost:8001).
 */

import api from './api';

/**
 * Returns all customers from the backend.
 */
export const getAllCustomers = async () => {
  const res = await api.get('/customers/');
  return res.data;
};

/**
 * Returns a single customer by ID.
 */
export const getCustomerById = async (id) => {
  const res = await api.get(`/customers/${id}`);
  return res.data;
};

/**
 * Creates a new customer.
 */
export const createCustomer = async (data) => {
  const res = await api.post('/customers/', {
    name: data.name,
    email: data.email,
    phone: data.phone,
    initial_deposit: Number(data.initialDeposit),
  });
  return res.data;
};

/**
 * Updates a customer's status.
 */
export const updateCustomerStatus = async (id, status) => {
  const res = await api.patch(`/customers/${id}`, { status });
  return res.data;
};

