import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../lib/auth';

const DEMO_ACCOUNTS = [
  { label: 'Администратор', email: 'admin@wastelogix.bg', pass: 'password123' },
  { label: 'Диспечер', email: 'dispatcher@wastelogix.bg', pass: 'password123' },
  { label: 'Шофьор', email: 'driver1@wastelogix.bg', pass: 'password123' },
  { label: 'Корпоративен клиент', email: 'corporate@buildco.bg', pass: 'password123' },
  { label: 'Физическо лице', email: 'ivan@gmail.com', pass: 'password123' },
];

const DISPATCHER_ROLES = ['ADMIN', 'DISPATCHER', 'ACCOUNTANT'];
const DRIVER_ROLES = ['DRIVER'];

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(email, password);
      if (DISPATCHER_ROLES.includes(user.role)) navigate('/dispatcher');
      else if (DRIVER_ROLES.includes(user.role)) navigate('/driver');
      else navigate('/client');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function quickLogin(acc) {
    setError('');
    setLoading(true);
    try {
      const user = await login(acc.email, acc.pass);
      if (DISPATCHER_ROLES.includes(user.role)) navigate('/dispatcher');
      else if (DRIVER_ROLES.includes(user.role)) navigate('/driver');
      else navigate('/client');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-900 via-slate-800 to-green-900 flex-col justify-between p-12">
        <div>
          <div className="flex items-center gap-3 mb-12">
            <img src="/logo-dark.png" alt="Logix" className="w-14 h-14" />
            <span className="text-white text-xl font-bold tracking-tight">Logix</span>
          </div>
          <h2 className="text-4xl font-bold text-white leading-tight mb-4">
            Интелигентна платформа<br />за управление на<br />строителни отпадъци
          </h2>
          <p className="text-slate-400 text-lg">Русенска и Североизточна България</p>
        </div>
        <div className="space-y-4">
          {[
            { icon: '🛣️', text: 'AI оптимизация на маршрути — спестяване до 30% гориво' },
            { icon: '📍', text: 'GPS проследяване в реално време на всички камиони' },
            { icon: '📊', text: 'BI анализи и справки за МОСВ' },
            { icon: '📦', text: 'Проследимост на контейнери с QR/RFID' },
          ].map(({ icon, text }) => (
            <div key={text} className="flex items-start gap-3">
              <span className="text-xl mt-0.5">{icon}</span>
              <span className="text-slate-300 text-sm">{text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8 bg-slate-50">
        <div className="w-full max-w-md">
          <div className="lg:hidden text-center mb-8">
            <img src="/logo.png" alt="Logix" className="w-16 h-16 mx-auto mb-2" />
            <h1 className="text-2xl font-bold text-slate-800">Logix</h1>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
            <h2 className="text-xl font-semibold text-slate-800 mb-1">Добре дошли</h2>
            <p className="text-slate-500 text-sm mb-6">Влезте в системата</p>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Имейл</label>
                <input
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  type="email" value={email}
                  onChange={e => setEmail(e.target.value)}
                  required placeholder="email@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Парола</label>
                <input
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  type="password" value={password}
                  onChange={e => setPassword(e.target.value)}
                  required placeholder="••••••••"
                />
              </div>
              <button
                type="submit" disabled={loading}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 rounded-lg transition-colors disabled:opacity-60"
              >
                {loading ? 'Влизане...' : 'Вход →'}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-slate-100">
              <p className="text-xs text-slate-400 mb-3 font-medium uppercase tracking-wide">Демо акаунти</p>
              <div className="space-y-1.5">
                {DEMO_ACCOUNTS.map(acc => (
                  <button
                    key={acc.email}
                    onClick={() => quickLogin(acc)}
                    className="w-full text-left px-3 py-2 rounded-lg bg-slate-50 hover:bg-green-50 hover:text-green-700 transition-colors text-sm flex justify-between items-center group"
                  >
                    <span className="font-medium text-slate-700 group-hover:text-green-700">{acc.label}</span>
                    <span className="text-slate-400 group-hover:text-green-500 text-xs">{acc.email}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <p className="text-center text-xs text-slate-400 mt-6">
            <a href="/guide" className="hover:text-green-600 underline">Ръководство на системата</a>
          </p>
        </div>
      </div>
    </div>
  );
}
