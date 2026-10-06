import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../lib/auth';
import { BarChart3, Navigation, Route, ScanLine } from 'lucide-react';

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
 <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-900 via-slate-800 to-green-900 flex-col justify-between p-12"><div><div className="flex items-center gap-3 mb-12"><img src="/logo-dark.png" alt="Logix" className="w-14 h-14" /><span className="text-white text-xl font-bold tracking-tight">Logix</span></div><h2 className="text-4xl font-bold text-white leading-tight mb-4">
 Интелигентна платформа<br />за управление на<br />строителни отпадъци
 </h2><p className="text-ink-3 text-lg">Русенска и Североизточна България</p></div><div className="space-y-4">
 {[
 { icon: Route, text: 'AI оптимизация на маршрути — спестяване до 30% гориво' },
 { icon: Navigation, text: 'GPS проследяване в реално време на всички камиони' },
 { icon: BarChart3, text: 'BI анализи и справки за МОСВ' },
 { icon: ScanLine, text: 'Проследимост на контейнери с QR/RFID' },
 ].map(({ icon, text }) => (
 <div key={text} className="flex items-start gap-3"><span className="mt-0.5 h-8 w-8 rounded-lg bg-surface/10 border border-white/15 flex items-center justify-center shrink-0">{(() => { const I = icon; return <I size={15} className="text-green-300" strokeWidth={2} />; })()}</span><span className="text-ink-3 text-sm">{text}</span></div>
 ))}
 </div></div>

 {/* Right panel */}
 <div className="flex-1 flex items-center justify-center p-8 bg-raised"><div className="w-full max-w-md"><div className="lg:hidden text-center mb-8"><img src="/logo.png" alt="Logix" className="w-16 h-16 mx-auto mb-2" /><h1 className="text-2xl font-bold text-ink">Logix</h1></div><div className="bg-surface rounded-2xl shadow-sm border border-line p-8"><h2 className="text-xl font-semibold text-ink mb-1">Добре дошли</h2><p className="text-ink-2 text-sm mb-6">Влезте в системата</p>

 {error && (
 <div className="bg-danger-soft border border-danger/25 text-danger rounded-lg p-3 mb-4 text-sm">
 {error}
 </div>
 )}

 <form onSubmit={handleSubmit} className="space-y-4"><div><label className="block text-sm font-medium text-ink mb-1">Имейл</label><input
 className="w-full px-3 py-2.5 border border-line-strong rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
 type="email" value={email}
 onChange={e => setEmail(e.target.value)}
 required placeholder="email@example.com"
 /></div><div><label className="block text-sm font-medium text-ink mb-1">Парола</label><input
 className="w-full px-3 py-2.5 border border-line-strong rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
 type="password" value={password}
 onChange={e => setPassword(e.target.value)}
 required placeholder="••••••••"
 /></div><button
 type="submit" disabled={loading}
 className="w-full bg-brand hover:bg-brand-strong text-brand-ink font-semibold py-2.5 rounded-lg transition-colors disabled:opacity-60"
 >
 {loading ? 'Влизане...' : 'Вход '}
 </button></form><div className="mt-6 pt-6 border-t border-line"><p className="text-xs text-ink-3 mb-3 font-medium uppercase tracking-wide">Демо акаунти</p><div className="space-y-1.5">
 {DEMO_ACCOUNTS.map(acc => (
 <button
 key={acc.email}
 onClick={() => quickLogin(acc)}
 className="w-full text-left px-3 py-2 rounded-lg bg-raised hover:bg-brand-soft hover:text-brand transition-colors text-sm flex justify-between items-center group"
 ><span className="font-medium text-ink group-hover:text-brand">{acc.label}</span><span className="text-ink-3 group-hover:text-green-500 text-xs">{acc.email}</span></button>
 ))}
 </div></div></div><p className="text-center text-xs text-ink-3 mt-6"><a href="/guide" className="hover:text-brand underline">Ръководство на системата</a></p></div></div></div>
 );
}
