import React, { useState } from 'react';
import { Routes, Route, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../lib/auth';
import {
  LayoutDashboard, ClipboardList, Map, Truck, Users,
  FileText, BookOpen, LogOut, Menu, X, UserCheck, Wrench, Settings, Factory,
  Sun, Moon,
} from 'lucide-react';
import GuideContent from '../../pages/GuidePage';
import NotificationBell from './NotificationBell';

import DashboardBI from './DashboardBI';
import OrdersManager from './OrdersManager';
import LiveMap from './LiveMap';
import Trips from './Trips';
import Clients from './Clients';
import Invoices from './Invoices';
import Drivers from './Drivers';
import TrucksManagement from './TrucksManagement';
import AdminSettings from './AdminSettings';
import DisposalSites from './DisposalSites';
import Documentation from './Documentation';
import Notifications from './Notifications';

const APP_VERSION = 'v2.37';

const NAV = [
  { to: '/dispatcher',                label: 'Табло',    icon: LayoutDashboard, end: true },
  { to: '/dispatcher/orders',         label: 'Заявки',   icon: ClipboardList },
  { to: '/dispatcher/map',            label: 'Карта',    icon: Map },
  { to: '/dispatcher/trips',          label: 'Курсове',  icon: Truck },
  { to: '/dispatcher/disposal-sites', label: 'Депа',     icon: Factory },
  { to: '/dispatcher/drivers',        label: 'Шофьори',  icon: UserCheck },
  { to: '/dispatcher/clients',        label: 'Клиенти',  icon: Users },
  { to: '/dispatcher/invoices',       label: 'Фактури',  icon: FileText },
];

const ADMIN_NAV = [
  { to: '/dispatcher/trucks',   label: 'Автомобили', icon: Wrench },
  { to: '/dispatcher/settings', label: 'Настройки',  icon: Settings },
];

const ROLE_LABEL = { ADMIN: 'Администратор', DISPATCHER: 'Диспечер', ACCOUNTANT: 'Счетоводител' };

// ── Theme definitions ──────────────────────────────────────────────────────
const THEMES = {
  dark: {
    gradient:    'linear-gradient(160deg, #0e4a25 0%, #082e17 60%, #041a0c 100%)',
    guideGrad:   'linear-gradient(90deg, #0e4a25, #041a0c)',
    sep:         'rgba(255,255,255,0.07)',
    label:       'rgba(255,255,255,0.38)',    // section labels ОПЕРАЦИИ / АДМИНИСТРАЦИЯ
    foot:        'rgba(255,255,255,0.38)',    // version / документация
    glassBg:     'rgba(0,0,0,0.35)',          // logo + bell container
    glassShadow: '0 1px 6px rgba(0,0,0,0.45)',
    userCardBg:  'rgba(0,0,0,0.30)',
    avatarBg:    'rgba(255,255,255,0.18)',
    activeClass: 'bg-white text-green-900 shadow-md',
    inactiveClass:'text-white/90 hover:bg-white/10',
    toggleActiveBg: 'rgba(255,255,255,0.18)',
  },
  light: {
    gradient:    'linear-gradient(160deg, #25c06a 0%, #1a9a52 60%, #147840 100%)',
    guideGrad:   'linear-gradient(90deg, #25c06a, #147840)',
    sep:         'rgba(0,0,0,0.10)',
    label:       'rgba(255,255,255,0.52)',
    foot:        'rgba(255,255,255,0.48)',
    glassBg:     'rgba(0,0,0,0.22)',
    glassShadow: '0 1px 4px rgba(0,0,0,0.25)',
    userCardBg:  'rgba(0,0,0,0.18)',
    avatarBg:    'rgba(255,255,255,0.25)',
    activeClass: 'bg-white text-green-800 shadow-md',
    inactiveClass:'text-white hover:bg-white/15',
    toggleActiveBg: 'rgba(255,255,255,0.22)',
  },
};

export default function DispatcherApp() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [guideOpen, setGuideOpen]     = useState(false);
  const [theme, setTheme]             = useState(
    () => {
      const saved = localStorage.getItem('logix_sidebar_theme');
      return saved === 'dark' ? 'dark' : 'light'; // light is the default
    }
  );

  function handleLogout() { logout(); navigate('/login'); }

  React.useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  function switchTheme(t) {
    setTheme(t);
    localStorage.setItem('logix_sidebar_theme', t);
  }

  const T = THEMES[theme];

  const navLinkClass = ({ isActive }) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
      isActive ? T.activeClass : T.inactiveClass
    }`;

  const SidebarContent = () => (
    <div className="flex flex-col h-full">

      {/* ── Logo bar ── */}
      <div className="px-4 py-4 flex items-center justify-between"
        style={{ borderBottom: `1px solid ${T.sep}` }}>
        <div className="flex items-center gap-2.5">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: T.glassBg, boxShadow: T.glassShadow }}>
            <img src="/logo-dark.png" alt="Logix" className="w-9 h-9" />
          </div>
          <span className="text-white font-bold text-[15px] tracking-tight">Logix</span>
        </div>
        <NotificationBell />
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">

        <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.12em]"
          style={{ color: T.label }}>Операции</p>

        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} onClick={() => setSidebarOpen(false)}
            className={navLinkClass}>
            <Icon className="w-4 h-4 flex-shrink-0" />
            {label}
          </NavLink>
        ))}

        {user?.role === 'ADMIN' && (
          <>
            <p className="px-3 pt-4 pb-2 text-[10px] font-bold uppercase tracking-[0.12em]"
              style={{ color: T.label }}>Администрация</p>
            {ADMIN_NAV.map(({ to, label, icon: Icon }) => (
              <NavLink key={to} to={to} onClick={() => setSidebarOpen(false)}
                className={navLinkClass}>
                <Icon className="w-4 h-4 flex-shrink-0" />
                {label}
              </NavLink>
            ))}
          </>
        )}

        <div className="pt-3 mt-2" style={{ borderTop: `1px solid ${T.sep}` }}>
          <button
            onClick={() => { setGuideOpen(true); setSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${T.inactiveClass}`}>
            <BookOpen className="w-4 h-4" />
            Ръководство
          </button>
        </div>
      </nav>

      {/* ── Theme toggle — above user card ── */}
      <div className="px-3 pb-2">
        <div className="flex rounded-xl overflow-hidden text-[11px] font-semibold"
          style={{ background: 'rgba(0,0,0,0.20)' }}>
          <button
            onClick={() => switchTheme('dark')}
            className="flex-1 py-2 flex items-center justify-center gap-1.5 transition-all"
            style={{
              background: theme === 'dark' ? T.toggleActiveBg : 'transparent',
              color: theme === 'dark' ? '#fff' : 'rgba(255,255,255,0.40)',
            }}>
            <Moon className="w-3.5 h-3.5" />
            Тъмна
          </button>
          <button
            onClick={() => switchTheme('light')}
            className="flex-1 py-2 flex items-center justify-center gap-1.5 transition-all"
            style={{
              background: theme === 'light' ? T.toggleActiveBg : 'transparent',
              color: theme === 'light' ? '#fff' : 'rgba(255,255,255,0.40)',
            }}>
            <Sun className="w-3.5 h-3.5" />
            Светла
          </button>
        </div>
      </div>

      {/* ── User card + version ── */}
      <div className="px-3 pb-3 pt-0 space-y-2.5"
        style={{ borderTop: `1px solid ${T.sep}` }}>

        <div className="flex items-center gap-2.5 px-2.5 py-2.5 rounded-xl mt-2"
          style={{ background: T.userCardBg }}>
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
            style={{ background: T.avatarBg }}>
            {user?.name?.charAt(0) || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white text-xs font-semibold truncate">{user?.name}</div>
            <div className="text-[11px]" style={{ color: T.label }}>{ROLE_LABEL[user?.role] || user?.role}</div>
          </div>
          <button onClick={handleLogout} title="Изход"
            className="text-white/55 hover:text-white p-1.5 rounded-lg hover:bg-white/15 transition-all">
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center justify-center gap-2 text-[10px]"
          style={{ color: T.foot }}>
          <span className="font-mono font-medium">{APP_VERSION}</span>
          <span style={{ opacity: 0.5 }}>|</span>
          <NavLink to="/dispatcher/documentation" onClick={() => setSidebarOpen(false)}
            className={({ isActive }) => `font-medium transition-colors ${isActive ? 'text-white' : ''}`}
            style={({ isActive }) => isActive ? {} : { color: T.foot }}>
            Документация
          </NavLink>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-56 flex-shrink-0 transition-all duration-500"
        style={{ background: T.gradient }}>
        <SidebarContent />
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <aside className="relative z-10 flex flex-col w-56"
            style={{ background: T.gradient }}>
            <button onClick={() => setSidebarOpen(false)}
              className="absolute top-3 right-3 text-white/60 hover:text-white p-1">
              <X className="w-4 h-4" />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Guide drawer */}
      {guideOpen && (
        <div className="fixed inset-0 z-[200] flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setGuideOpen(false)} />
          <div className="relative ml-auto w-full max-w-3xl bg-white shadow-2xl flex flex-col h-full z-10">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 flex-shrink-0"
              style={{ background: T.guideGrad }}>
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-white" />
                <span className="font-bold text-white">Ръководство на системата</span>
              </div>
              <button onClick={() => setGuideOpen(false)} className="text-white/70 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <GuideContent embedded />
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-slate-200 shadow-sm">
          <button onClick={() => setSidebarOpen(true)} className="text-slate-500 hover:text-slate-700">
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-bold text-slate-800 text-sm">Logix</span>
        </header>
        <main className="flex-1 overflow-auto">
          <Routes>
            <Route index element={<DashboardBI />} />
            <Route path="orders" element={<OrdersManager />} />
            <Route path="map" element={<LiveMap />} />
            <Route path="trips" element={<Trips />} />
            <Route path="drivers" element={<Drivers />} />
            <Route path="clients" element={<Clients />} />
            <Route path="invoices" element={<Invoices />} />
            <Route path="disposal-sites" element={<DisposalSites />} />
            <Route path="trucks" element={<TrucksManagement />} />
            <Route path="settings" element={<AdminSettings />} />
            <Route path="documentation" element={<Documentation />} />
            <Route path="notifications" element={<Notifications />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
