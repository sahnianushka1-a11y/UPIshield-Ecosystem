/**
 * Mock API layer.
 *
 * While the Bank backend is not yet ready, all service files delegate to this
 * mock layer.  When real endpoints are available, simply swap the mock calls
 * for real API calls — no component code needs to change.
 *
 * Each function returns a Promise that resolves after a short delay to
 * simulate network latency.
 */

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ---------- Auth ----------
export const mockAuth = {
  login: async (email, password) => {
    await delay(800);
    if (email && password) {
      return {
        success: true,
        token: 'demo-jwt-token-' + Date.now(),
        user: {
          id: 'admin-001',
          name: 'Bank Administrator',
          email,
          role: 'admin',
        },
      };
    }
    return { success: false, message: 'Invalid credentials' };
  },
};
