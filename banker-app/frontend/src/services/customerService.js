/**
 * Customer mock API.
 * Provides simulated customer data and CRUD operations.
 *
 * All mutations go through the shared BankerContext state,
 * so changes are visible across all pages.
 */

import { useBanker } from '../context/BankerContext';

/* ============================================================
   VALIDATION HELPERS
   ============================================================ */

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPhone(phone) {
  return /^\+?[\d\s\-()]{8,15}$/.test(phone);
}

/* ============================================================
   HOOK VERSION — for use inside components
   ============================================================ */

export function useCustomers() {
  const { getCustomers, createCustomer: dispatchCreate, updateCustomerStatus: dispatchUpdate } = useBanker();
  const customers = getCustomers();
  return {
    customers,
    getAll: () => customers,
    getById: (id) => customers.find((c) => c.id === id) || null,
    create: (data) => {
      const customerNumber = customers.reduce((max, customer) => {
        const number = Number(customer.id.replace('CUST-', ''));
        return Number.isFinite(number) ? Math.max(max, number) : max;
      }, 0) + 1;
      const accountNumber = customers.reduce((max, customer) => {
        const number = Number(customer.accountNumber.replace('ACC-', ''));
        return Number.isFinite(number) ? Math.max(max, number) : max;
      }, 10000) + 1;
      const initialDeposit = Number(data.initialDeposit);
      if (!data.name?.trim() || !isValidEmail(data.email) || !isValidPhone(data.phone) || !Number.isFinite(initialDeposit) || initialDeposit < 0) {
        throw new Error('Invalid customer details');
      }
      const newCustomer = {
        id: `CUST-${String(customerNumber).padStart(3, '0')}`,
        name: data.name,
        email: data.email,
        phone: data.phone,
        accountNumber: `ACC-${String(accountNumber)}`,
        balance: initialDeposit,
        status: 'ACTIVE',
        createdAt: new Date().toISOString().split('T')[0],
      };
      dispatchCreate(newCustomer);
      return newCustomer;
    },
    updateStatus: (id, status) => {
      dispatchUpdate(id, status);
      return { success: true, id, status };
    },
  };
}

/* ============================================================
   STATIC VERSION — for backward compatibility
   In production these would be HTTP calls to the backend.
   ============================================================ */

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Returns all customers from the shared context state.
 */
export const getAllCustomers = async () => {
  await delay(700);
  // In production: const res = await api.get('/customers');
  // For now, we return a placeholder. The Customers page uses
  // the hook version which has live state.
  return [];
};

/**
 * Returns a single customer by ID.
 */
export const getCustomerById = async (id) => {
  await delay(500);
  return null;
};

/**
 * Creates a new customer.
 * In production: POST /customers
 */
export const createCustomer = async (data) => {
  await delay(900);
  // In production: const res = await api.post('/customers', data);
  // For now, we return a placeholder. The Customers page uses
  // the hook version which dispatches to context.
  return { success: true, customer: { ...data, id: 'CUST-NEW' } };
};

/**
 * Updates a customer's status.
 * In production: PATCH /customers/:id/status
 */
export const updateCustomerStatus = async (id, status) => {
  await delay(600);
  return { success: true, id, status };
};
