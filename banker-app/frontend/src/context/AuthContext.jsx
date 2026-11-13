/**
 * Authentication Context.
 *
 * Wraps the app so every component can access the current user
 * and the login/logout functions.  Token and user data are stored
 * in localStorage so they survive page refreshes.
 */

import { createContext, useContext, useState, useEffect } from 'react';
import { mockAuth } from '../services/mockApi';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On mount, check if a valid session exists in localStorage
  useEffect(() => {
    const token = localStorage.getItem('banker_token');
    const storedUser = localStorage.getItem('banker_user');
    if (token && storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  // ---------- Login ----------
  const login = async (email, password) => {
    const result = await mockAuth.login(email, password);
    if (result.success) {
      localStorage.setItem('banker_token', result.token);
      localStorage.setItem('banker_user', JSON.stringify(result.user));
      setUser(result.user);
      return { success: true };
    }
    return { success: false, message: result.message };
  };

  // ---------- Logout ----------
  const logout = () => {
    localStorage.removeItem('banker_token');
    localStorage.removeItem('banker_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook for easier consumption
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
