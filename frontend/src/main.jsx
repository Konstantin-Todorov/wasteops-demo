import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './index.css';

import Login from './components/shared/Login';
import DevLogin from './components/shared/DevLogin';
import { AuthProvider, useAuth } from './lib/auth';

import DispatcherApp from './portals/dispatcher/DispatcherApp';
import ClientApp from './portals/client/ClientApp';
import DriverApp from './portals/driver/DriverApp';
import GuidePage from './pages/GuidePage';
import LandingPage from './pages/LandingPage';

const DISPATCHER_ROLES = ['ADMIN', 'DISPATCHER', 'ACCOUNTANT'];
const CLIENT_ROLES = ['CORPORATE_CLIENT', 'INDIVIDUAL_CLIENT'];
const DRIVER_ROLES = ['DRIVER'];

function RoleRouter() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  if (DISPATCHER_ROLES.includes(user.role)) return <Navigate to="/dispatcher" />;
  if (DRIVER_ROLES.includes(user.role)) return <Navigate to="/driver" />;
  return <Navigate to="/client" />;
}

function ProtectedRoute({ children, roles }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" />;
  return children;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <AuthProvider>
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/dev-login" element={<DevLogin />} />
        <Route path="/guide" element={<GuidePage />} />
        <Route path="/landing" element={<LandingPage />} />
        <Route path="/" element={<RoleRouter />} />
        <Route path="/dispatcher/*" element={
          <ProtectedRoute roles={DISPATCHER_ROLES}>
            <DispatcherApp />
          </ProtectedRoute>
        } />
        <Route path="/client/*" element={
          <ProtectedRoute roles={CLIENT_ROLES}>
            <ClientApp />
          </ProtectedRoute>
        } />
        <Route path="/driver/*" element={
          <ProtectedRoute roles={DRIVER_ROLES}>
            <DriverApp />
          </ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  </AuthProvider>
);
