/**
 * Failure Simulator mock API.
 * Provides simulated failure injection and recovery endpoints.
 *
 * All mutations go through the shared BankerContext state,
 * so failures are visible across all pages.
 */

import { useBanker } from '../context/BankerContext';
import { syncInfrastructureCache } from './infrastructureService';

/* ============================================================
   HOOK VERSION — for use inside components
   ============================================================ */

export function useFailureSimulator() {
  const { injectFailure: inject, recoverService: recover, getActiveFailures, getFailureHistory, getAllServices } = useBanker();
  return { injectFailure: inject, recoverService: recover, getActiveFailures, getFailureHistory, getAllServices };
}

/* ============================================================
   STATIC VERSION — for backward compatibility
   These call the context actions under the hood.
   In a real app these would be HTTP calls to the backend.
   ============================================================ */

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const serviceList = ['payment-api', 'auth-api', 'bank-db', 'upi-gateway', 'payment-processor', 'external-payments'];

/**
 * Get current failure status from the shared context.
 * Returns active failures and the list of all services.
 */
export const getFailureStatus = async () => {
  await delay(400);
  // In production this would be: const res = await api.get('/failures/status');
  // For now, we need the context. Since this is called outside React in some paths,
  // we fall back to an empty array if context is not available.
  try {
    // We can't access context outside a component, so we return a
    // placeholder. The FailureSimulator page uses the hook version
    // which has live state.
    return { activeFailures: [], allServices: serviceList };
  } catch {
    return { activeFailures: [], allServices: serviceList };
  }
};

/**
 * Inject a simulated failure.
 * Dispatches INJECT_FAILURE to the shared state.
 */
export const injectFailure = async (serviceId, failureType) => {
  await delay(700);
  // Dispatch to shared state
  // Since we can't call dispatch outside a component, we use a
  // workaround: the FailureSimulator page calls injectFailure
  // directly from the context via the hook.
  // This static version is kept for API compatibility.
  // In the actual page, we use the hook version.
  return {
    success: true,
    message: `Simulated ${failureType} injected on ${serviceId}`,
    serviceId,
    failureType,
    timestamp: new Date().toISOString(),
  };
};

/**
 * Recover a service from a simulated failure.
 * Dispatches RECOVER_SERVICE to the shared state.
 */
export const recoverService = async (serviceId) => {
  await delay(600);
  return {
    success: true,
    message: `Service ${serviceId} recovered`,
    serviceId,
    timestamp: new Date().toISOString(),
  };
};

