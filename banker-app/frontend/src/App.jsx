/**
 * App.jsx — Main application entry point.
 *
 * Handles authentication checks, protected routes,
 * and the main layout with sidebar + topbar.
 */

import { BrowserRouter, Routes, Route, Navigate, useLocation, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import Transactions from './pages/Transactions';
import Infrastructure from './pages/Infrastructure';
import FailureSimulator from './pages/FailureSimulator';
import Settings from './pages/Settings';
import './styles/global.css';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="loading-center" style={{ minHeight: '100vh' }}>
        <div className="spinner" /><p>Loading...</p>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function AppLayout() {
  const location = useLocation();
  const titles = {
    '/': 'Overview',
    '/customers': 'Customers',
    '/transactions': 'Transactions',
    '/infrastructure': 'Infrastructure',
    '/failure-simulator': 'Failure Simulator',
    '/settings': 'Settings',
  };
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="app-main">
        <Topbar pageTitle={titles[location.pathname] || 'Banker App'} />
        <main className="app-content"><Outlet /></main>
      </div>
    </div>
  );
}

function RouteRenderer() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="customers" element={<Customers />} />
        <Route path="transactions" element={<Transactions />} />
        <Route path="infrastructure" element={<Infrastructure />} />
        <Route path="failure-simulator" element={<FailureSimulator />} />
        <Route path="settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <RouteRenderer />
      </AuthProvider>
    </BrowserRouter>
  );
}

