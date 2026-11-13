/**
 * Infrastructure mock API.
 * Provides simulated infrastructure health data for monitoring.
 *
 * Reads from the shared BankerContext state so injected failures
 * are reflected in the infrastructure view.
 */

import { useBanker } from '../context/BankerContext';

/**
 * Hook version — call inside a React component wrapped by BankerProvider.
 * Returns the current infrastructure services array.
 */
export function useInfrastructureServices() {
  const { getServices } = useBanker();
  return getServices();
}

/**
 * Static version — used by Dashboard which calls it before
 * the context is available (mount-time fetch).
 * In production this would be a real API call.
 */
let _cachedServices = [
  { id: 'payment-api', name: 'Payment API', status: 'OPERATIONAL', latency: 120, availability: 99.9, lastUpdate: new Date().toISOString(), failureInfo: null },
  { id: 'auth-api', name: 'Authentication API', status: 'OPERATIONAL', latency: 85, availability: 99.95, lastUpdate: new Date().toISOString(), failureInfo: null },
  { id: 'bank-db', name: 'Bank Database', status: 'OPERATIONAL', latency: 45, availability: 100, lastUpdate: new Date().toISOString(), failureInfo: null },
  { id: 'upi-gateway', name: 'UPI Gateway', status: 'OPERATIONAL', latency: 200, availability: 99.8, lastUpdate: new Date().toISOString(), failureInfo: null },
  { id: 'payment-processor', name: 'Payment Processing Service', status: 'OPERATIONAL', latency: 200, availability: 99.8, lastUpdate: new Date().toISOString(), failureInfo: null },
  { id: 'external-payments', name: 'External Payment Dependencies', status: 'OPERATIONAL', latency: 340, availability: 99.5, lastUpdate: new Date().toISOString(), failureInfo: null },
];

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const getInfrastructureHealth = async () => {
  await delay(600);
  return _cachedServices.map((s) => ({ ...s }));
};

/**
 * Call this after injecting a failure to sync the static cache
 * with the context state. Called internally by the failure service.
 */
export function syncInfrastructureCache(stateServices) {
  _cachedServices = stateServices.map((s) => ({ ...s }));
}

