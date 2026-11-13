/**
 * Centralized API service layer using Axios.
 * All HTTP requests to the Bank backend go through this file.
 *
 * The base URL is read from the VITE_BANK_API_URL environment variable.
 * If the variable is not set, it falls back to http://localhost:8001.
 */

import axios from 'axios';

// ---------- Axios instance ----------
const api = axios.create({
  baseURL: import.meta.env.VITE_BANK_API_URL || 'http://localhost:8001',
  headers: {
    'Content-Type': 'application/json',
  },
});

// ---------- Request interceptor ----------
// Attaches the authentication token (stored in localStorage) to every request.
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('banker_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ---------- Response interceptor ----------
// Catches 401 Unauthorized responses and logs the user out automatically.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Token expired or invalid — clear storage and redirect to login
      localStorage.removeItem('banker_token');
      localStorage.removeItem('banker_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
