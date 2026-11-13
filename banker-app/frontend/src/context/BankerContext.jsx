/**
 * BankerContext — Centralized shared state for the Banker Application.
 *
 * This context holds:
 *   - infrastructureServices: mutable array of service objects
 *   - activeFailures: currently active failure records
 *   - failureHistory: all failures ever injected (including recovered)
 *   - recentActivity: combined feed of all events
 *   - customers: all customer records (mock)
 *   - transactions: all transaction records (mock)
 *
 * All mutation happens through the reducer (dispatch).
 * Pages consume state via useBanker() and re-render automatically
 * when state changes.
 *
 * This is the single source of truth for infrastructure, failure,
 * customer, and transaction data.
 */

import { createContext, useContext, useReducer, useCallback } from 'react';

/* ============================================================
   INITIAL STATE
   ============================================================ */

const initialServices = [
  { id: 'payment-api', name: 'Payment API', status: 'OPERATIONAL', latency: 120, availability: 99.9, lastUpdate: new Date().toISOString(), failureInfo: null },
  { id: 'auth-api', name: 'Authentication API', status: 'OPERATIONAL', latency: 85, availability: 99.95, lastUpdate: new Date().toISOString(), failureInfo: null },
  { id: 'bank-db', name: 'Bank Database', status: 'OPERATIONAL', latency: 45, availability: 100, lastUpdate: new Date().toISOString(), failureInfo: null },
  { id: 'upi-gateway', name: 'UPI Gateway', status: 'OPERATIONAL', latency: 200, availability: 99.8, lastUpdate: new Date().toISOString(), failureInfo: null },
  { id: 'payment-processor', name: 'Payment Processing Service', status: 'OPERATIONAL', latency: 200, availability: 99.8, lastUpdate: new Date().toISOString(), failureInfo: null },
  { id: 'external-payments', name: 'External Payment Dependencies', status: 'OPERATIONAL', latency: 340, availability: 99.5, lastUpdate: new Date().toISOString(), failureInfo: null },
];

const sampleCustomers = [
  { id: 'CUST-001', name: 'Rahul Sharma', email: 'rahul@example.com', phone: '+91 98765 43210', accountNumber: 'ACC-10001', balance: 54200, status: 'ACTIVE', createdAt: '2026-10-01' },
  { id: 'CUST-002', name: 'Ananya Patel', email: 'ananya@example.com', phone: '+91 98765 43211', accountNumber: 'ACC-10002', balance: 128500, status: 'ACTIVE', createdAt: '2026-10-05' },
  { id: 'CUST-003', name: 'Vikram Singh', email: 'vikram@example.com', phone: '+91 98765 43212', accountNumber: 'ACC-10003', balance: 0, status: 'INACTIVE', createdAt: '2026-10-10' },
  { id: 'CUST-004', name: 'Priya Nair', email: 'priya@example.com', phone: '+91 98765 43213', accountNumber: 'ACC-10004', balance: 76300, status: 'ACTIVE', createdAt: '2026-10-15' },
  { id: 'CUST-005', name: 'Arjun Reddy', email: 'arjun@example.com', phone: '+91 98765 43214', accountNumber: 'ACC-10005', balance: 31000, status: 'ACTIVE', createdAt: '2026-10-20' },
];

const sampleTransactions = [
  { id: 'TXN-001', senderAccount: 'ACC-10001', receiverAccount: 'ACC-10002', sender: 'Rahul Sharma', receiver: 'Ananya Patel', amount: 12500, timestamp: '2026-11-13 10:30:00', status: 'SUCCESS', route: 'UPI', failureReason: null },
  { id: 'TXN-002', senderAccount: 'ACC-10002', receiverAccount: 'ACC-10004', sender: 'Ananya Patel', receiver: 'Priya Nair', amount: 45000, timestamp: '2026-11-13 10:25:00', status: 'SUCCESS', route: 'NEFT', failureReason: null },
  { id: 'TXN-003', senderAccount: 'ACC-10003', receiverAccount: 'ACC-10001', sender: 'Vikram Singh', receiver: 'Rahul Sharma', amount: 3200, timestamp: '2026-11-13 10:20:00', status: 'FAILED', route: 'UPI', failureReason: 'Insufficient balance' },
  { id: 'TXN-004', senderAccount: 'ACC-10004', receiverAccount: 'ACC-10005', sender: 'Priya Nair', receiver: 'Arjun Reddy', amount: 8900, timestamp: '2026-11-13 10:15:00', status: 'PENDING', route: 'UPI', failureReason: null },
  { id: 'TXN-005', senderAccount: 'ACC-10005', receiverAccount: 'ACC-10001', sender: 'Arjun Reddy', receiver: 'Rahul Sharma', amount: 67000, timestamp: '2026-11-13 10:10:00', status: 'PROCESSING', route: 'IMPS', failureReason: null },
  { id: 'TXN-006', senderAccount: 'ACC-10001', receiverAccount: 'ACC-10003', sender: 'Rahul Sharma', receiver: 'Vikram Singh', amount: 1500, timestamp: '2026-11-13 10:05:00', status: 'UNKNOWN', route: 'UPI', failureReason: null },
  { id: 'TXN-007', senderAccount: 'ACC-10002', receiverAccount: 'ACC-10005', sender: 'Ananya Patel', receiver: 'Arjun Reddy', amount: 22000, timestamp: '2026-11-13 09:55:00', status: 'SUCCESS', route: 'UPI', failureReason: null },
  { id: 'TXN-008', senderAccount: 'ACC-10004', receiverAccount: 'ACC-10001', sender: 'Priya Nair', receiver: 'Rahul Sharma', amount: 5600, timestamp: '2026-11-13 09:50:00', status: 'FAILED', route: 'NEFT', failureReason: 'Account frozen' },
];

const initialState = {
  infrastructureServices: [...initialServices],
  activeFailures: [],
  failureHistory: [],
  recentActivity: [
    { id: 'act-1', type: 'customer_created', message: 'New customer R. Sharma registered', time: '2 min ago' },
    { id: 'act-2', type: 'transaction', message: 'UPI transfer ₹12,500 completed', time: '5 min ago' },
    { id: 'act-3', type: 'alert', message: 'API latency spike on Payment Gateway', time: '12 min ago' },
    { id: 'act-4', type: 'customer_created', message: 'New customer A. Patel registered', time: '18 min ago' },
    { id: 'act-5', type: 'transaction', message: 'NEFT transfer ₹45,000 processed', time: '25 min ago' },
  ],
  customers: [...sampleCustomers],
  transactions: [...sampleTransactions],
};

/* ============================================================
   HELPERS
   ============================================================ */

let activityCounter = 100;

function generateActivityId() {
  return `act-${++activityCounter}`;
}

function addActivity(type, message) {
  return { id: generateActivityId(), type, message, time: 'Just now' };
}

function getFailureStatusFromType(failureType) {
  const timeoutTypes = ['API_TIMEOUT', 'API timeout', 'NETWORK_INTERRUPTION', 'Network interruption'];
  if (timeoutTypes.includes(failureType)) return 'DEGRADED';
  return 'DOWN';
}

function getFailureLatency(failureType) {
  if (failureType === 'API timeout' || failureType === 'API_TIMEOUT') return 5000 + Math.floor(Math.random() * 5000);
  if (failureType === 'Network interruption' || failureType === 'NETWORK_INTERRUPTION') return 8000 + Math.floor(Math.random() * 7000);
  if (failureType === 'Response lost' || failureType === 'RESPONSE_LOST') return 9999;
  return 9999;
}

const serviceLabels = {
  'payment-api': 'Payment API',
  'auth-api': 'Authentication API',
  'bank-db': 'Bank Database',
  'upi-gateway': 'UPI Gateway',
  'payment-processor': 'Payment Processing Service',
  'external-payments': 'External Payment Dependencies',
};

/* ============================================================
   REDUCER
   ============================================================ */

function bankerReducer(state, action) {
  switch (action.type) {
    case 'INJECT_FAILURE': {
      const { serviceId, failureType } = action.payload;
      const now = new Date().toISOString();
      const failureStatus = getFailureStatusFromType(failureType);
      const failureId = `FAIL-${String(state.failureHistory.length + 1).padStart(4, '0')}`;

      const updatedServices = state.infrastructureServices.map((svc) =>
        svc.id === serviceId
          ? {
              ...svc,
              status: failureStatus,
              latency: getFailureLatency(failureType),
              availability: failureStatus === 'DOWN' ? 0 : svc.availability - 2.7,
              lastUpdate: now,
              failureInfo: `Simulated failure: ${failureType}`,
            }
          : svc
      );

      const newFailure = {
        id: failureId,
        serviceId,
        serviceName: serviceLabels[serviceId] || serviceId,
        failureType,
        status: 'ACTIVE',
        injectedAt: now,
        recoveredAt: null,
      };

      return {
        ...state,
        infrastructureServices: updatedServices,
        activeFailures: [...state.activeFailures, newFailure],
        failureHistory: [...state.failureHistory, newFailure],
        recentActivity: [addActivity('alert', `Failure injected: ${serviceLabels[serviceId] || serviceId} — ${failureType}`), ...state.recentActivity],
      };
    }

    case 'RECOVER_SERVICE': {
      const { serviceId } = action.payload;
      const now = new Date().toISOString();
      const matchingFailure = state.activeFailures.find((f) => f.serviceId === serviceId);

      if (!matchingFailure) return state;

      const originalService = initialServices.find((s) => s.id === serviceId);

      const updatedServices = state.infrastructureServices.map((svc) =>
        svc.id === serviceId
          ? {
              ...svc,
              status: 'OPERATIONAL',
              latency: originalService ? originalService.latency : 120,
              availability: originalService ? originalService.availability : 99.9,
              lastUpdate: now,
              failureInfo: null,
            }
          : svc
      );

      const updatedHistory = state.failureHistory.map((f) =>
        f.id === matchingFailure.id ? { ...f, status: 'RECOVERED', recoveredAt: now } : f
      );

      const updatedActive = state.activeFailures.filter((f) => f.id !== matchingFailure.id);

      return {
        ...state,
        infrastructureServices: updatedServices,
        activeFailures: updatedActive,
        failureHistory: updatedHistory,
        recentActivity: [addActivity('alert', `Service recovered: ${serviceLabels[serviceId] || serviceId}`), ...state.recentActivity],
      };
    }

    /* ---- Customer actions ---- */

    case 'CREATE_CUSTOMER': {
      const { customer } = action.payload;
      return {
        ...state,
        customers: [...state.customers, customer],
        recentActivity: [addActivity('customer_created', `New customer ${customer.name} registered`), ...state.recentActivity],
      };
    }

    case 'UPDATE_CUSTOMER_STATUS': {
      const { customerId, status } = action.payload;
      const updatedCustomers = state.customers.map((c) =>
        c.id === customerId ? { ...c, status } : c
      );
      return {
        ...state,
        customers: updatedCustomers,
      };
    }

    /* ---- Transaction actions ---- */

    case 'CREATE_TRANSACTION': {
      const { transaction } = action.payload;
      return {
        ...state,
        transactions: [transaction, ...state.transactions],
        recentActivity: [addActivity('transaction', `Transaction ${transaction.id} initiated — ₹${transaction.amount.toLocaleString('en-IN')}`), ...state.recentActivity],
      };
    }

    default:
      return state;
  }
}

/* ============================================================
   CONTEXT + PROVIDER
   ============================================================ */

const BankerContext = createContext(null);

export function BankerProvider({ children }) {
  const [state, dispatch] = useReducer(bankerReducer, initialState);

  const injectFailure = useCallback(
    (serviceId, failureType) => {
      dispatch({ type: 'INJECT_FAILURE', payload: { serviceId, failureType } });
    },
    [dispatch]
  );

  const recoverService = useCallback(
    (serviceId) => {
      dispatch({ type: 'RECOVER_SERVICE', payload: { serviceId } });
    },
    [dispatch]
  );

  const createCustomer = useCallback(
    (customer) => {
      dispatch({ type: 'CREATE_CUSTOMER', payload: { customer } });
    },
    [dispatch]
  );

  const updateCustomerStatus = useCallback(
    (customerId, status) => {
      dispatch({ type: 'UPDATE_CUSTOMER_STATUS', payload: { customerId, status } });
    },
    [dispatch]
  );

  const createTransaction = useCallback(
    (transaction) => {
      dispatch({ type: 'CREATE_TRANSACTION', payload: { transaction } });
    },
    [dispatch]
  );

  return (
    <BankerContext.Provider
      value={{
        state,
        injectFailure,
        recoverService,
        createCustomer,
        updateCustomerStatus,
        createTransaction,
        getServices: () => state.infrastructureServices,
        getActiveFailures: () => state.activeFailures,
        getFailureHistory: () => state.failureHistory,
        getRecentActivity: () => state.recentActivity,
        getAllServices: () => state.infrastructureServices.map((s) => s.id),
        getCustomers: () => state.customers,
        getTransactions: () => state.transactions,
      }}
    >
      {children}
    </BankerContext.Provider>
  );
}

export function useBanker() {
  const context = useContext(BankerContext);
  if (!context) {
    throw new Error('useBanker must be used within a BankerProvider');
  }
  return context;
}

/* ============================================================
   COMPUTED STATS (called by dashboard service)
   Derives metrics from actual customer and transaction data.
   ============================================================ */

export function computeDashboardStats(state) {
  const activeCount = state.activeFailures.length;
  const allOperational = activeCount === 0;

  const customers = state.customers || [];
  const transactions = state.transactions || [];

  const totalCustomers = customers.length;
  const totalTransactions = transactions.length;
  const successfulTransactions = transactions.filter((t) => t.status === 'SUCCESS').length;
  const failedTransactions = transactions.filter((t) => t.status === 'FAILED').length;
  const pendingTransactions = transactions.filter((t) => t.status === 'PENDING').length;
  const totalVolume = transactions.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  return {
    totalCustomers,
    totalTransactions,
    totalVolume: `₹${totalVolume.toLocaleString('en-IN')}`,
    successfulTransactions,
    failedTransactions,
    pendingTransactions,
    infrastructureHealth: allOperational ? 'OPERATIONAL' : 'DEGRADED',
    activeAlerts: activeCount,
    recentActivity: state.recentActivity,
  };
}