import React, { useState } from 'react';
import { Routes, Route, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../lib/auth';
import ClientDashboard from './ClientDashboard';
import NewOrder from './NewOrder';
import ClientHistory from './ClientHistory';
import ClientInvoices from './ClientInvoices';
import ClientProfile from './ClientProfile';
import { Plus, LayoutDashboard, ClipboardList, FileText, LogOut, Menu, X, UserCircle } from 'lucide-react';

const NAV = [
  { to: '/client',           label: 'Табло',    icon: LayoutDashboard, end: true },
  { to: '/client/new-order', label: 'Заявка',   icon: Plus },
  { to: '/client/history',   label: 'История',  icon: ClipboardList },
  { to: '/client/invoices',  label: 'Фактури',  icon: FileText },
  { to: '/client/profile',   label: 'Профил',   icon: UserCircle },
];

export default function ClientApp() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  function handleLogout() { logout(); navigate('/login'); }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 flex items-center h-14 gap-3">
          <div className="flex items-center gap-2 flex-shrink-0">
            <img src="/logo.png" alt="Logix" className="w-7 h-7" />
            <span className="font-bold text-slate-800 text-sm hidden md:inline">Logix</span>
          </div>

          <nav className="hidden sm:flex gap-0.5">
            {NAV.map(({ to, label, icon: Icon, end }) => (
              <NavLink key={to} to={to} end={end}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                    isActive ? 'bg-green-50 text-green-700' : 'text-slate-600 hover:bg-slate-100'
                  }`
                }
              >
                <Icon className="w-4 h-4" />
                <span className="hidden lg:inline">{label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <span className="text-sm text-slate-600 hidden md:inline font-medium truncate max-w-32">{user?.name}</span>
            <button onClick={handleLogout}
              className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 border border-slate-200 rounded-lg px-2.5 py-1.5 transition-colors">
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Изход</span>
            </button>
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="sm:hidden text-slate-500">
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        {mobileMenuOpen && (
          <div className="sm:hidden border-t border-slate-100 bg-white px-4 py-2 flex gap-1 overflow-x-auto">
            {NAV.map(({ to, label, icon: Icon, end }) => (
              <NavLink key={to} to={to} end={end} onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                    isActive ? 'bg-green-50 text-green-700' : 'text-slate-600'
                  }`
                }
              >
                <Icon className="w-4 h-4" />
                {label}
              </NavLink>
            ))}
          </div>
        )}
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6">
        <Routes>
          <Route index element={<ClientDashboard />} />
          <Route path="new-order" element={<NewOrder />} />
          <Route path="history" element={<ClientHistory />} />
          <Route path="invoices" element={<ClientInvoices />} />
          <Route path="profile" element={<ClientProfile />} />
        </Routes>
      </main>
    </div>
  );
}
