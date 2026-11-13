/**
 * Infrastructure service — communicates with the Bank backend.
 *
 * Uses the centralized api.js axios instance.
 * All requests go to VITE_BANK_API_URL (http://localhost:8001).
 */

import api from './api';

/**
 * Returns the health status of all infrastructure services.
 */
export const getInfrastructureHealth = async () => {
  const res = await api.get('/infrastructure/');
  return res.data.map((service) => ({
    ...service,
    lastUpdate: service.last_update,
    failureInfo: service.failure_info,
  }));
};


