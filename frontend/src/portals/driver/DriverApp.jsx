import React from 'react';
import { Routes, Route, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../lib/auth';
import DriverRoute from './DriverRoute';
import QRScanner from './QRScanner';
import DriverStats from './DriverStats';
import { Map, QrCode, BarChart3, LogOut } from 'lucide-react';

const NAV = [
  { to: '/driver',      label: 'Маршрут', icon: Map,      end: true },
  { to: '/driver/qr',   label: 'QR Скан', icon: QrCode },
  { to: '/driver/stats', label: 'Статистики', icon: BarChart3 },
];

export default function DriverApp() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() { logout(); navigate('/login'); }

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      {/* Header */}
      <header className="bg-slate-800 text-white px-4 py-3 flex items-center gap-3 flex-shrink-0">
        <img src="/logo-dark.png" alt="Logix" className="w-8 h-8 flex-shrink-0" />
        <div className="flex-1">
          <p className="font-bold text-sm leading-tight">Logix — Шофьор</p>
          <p className="text-slate-400 text-xs">{user?.name}</p>
        </div>
        <button onClick={handleLogout} className="text-slate-400 hover:text-white transition-colors">
          <LogOut className="w-4 h-4" />
        </button>
      </header>

      {/* Content — responsive: phone shows full, tablet/desktop shows centered column */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto w-full h-full">
          <Routes>
            <Route index element={<DriverRoute />} />
            <Route path="qr" element={<QRScanner />} />
            <Route path="stats" element={<DriverStats />} />
          </Routes>
        </div>
      </main>

      {/* Bottom navigation */}
      <nav className="flex bg-white border-t border-slate-200 flex-shrink-0">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center gap-1 py-3 text-xs font-medium transition-colors ${
                isActive ? 'text-green-600 bg-green-50' : 'text-slate-500 hover:text-slate-700'
              }`
            }
          >
            <Icon className="w-5 h-5" />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
