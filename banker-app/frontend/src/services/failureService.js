/**
 * Failure service — communicates with the Bank backend.
 *
 * Uses the centralized api.js axios instance.
 * All requests go to VITE_BANK_API_URL (http://localhost:8001).
 */

import api from './api';

/**
 * Returns the current failure status (active failures + service list).
 */
export const getFailureStatus = async () => {
  const res = await api.get('/failures/status');
  return res.data;
};

/**
 * Injects a simulated failure on the specified service.
 */
export const injectFailure = async (serviceId, failureType) => {
  const res = await api.post('/failures/inject', {
    service_id: serviceId,
    failure_type: failureType,
  });
  return res.data;
};

/**
 * Recovers a service from a simulated failure.
 */
export const recoverService = async (failureId) => {
  const res = await api.post(`/failures/${failureId}/recover`);
  return res.data;
};


