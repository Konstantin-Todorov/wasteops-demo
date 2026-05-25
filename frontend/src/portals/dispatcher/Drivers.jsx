import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { RefreshCw, Truck, MapPin, CheckCircle, AlertTriangle, TrendingUp, Calendar, BarChart3, Plus, X, Edit2 } from 'lucide-react';

// Works for both create (driver=null) and edit (driver = existing user object)
function DriverModal({ driver, onClose, onSaved }) {
  const isEdit = !!driver;
  const [form, setForm] = useState(
    isEdit
      ? { name: driver.name || '', phone: driver.phone || '', hourlyRate: driver.hourlyRate ?? '' }
      : { name: '', email: '', password: '', phone: '', role: 'DRIVER' }
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function handleSubmit(e) {
    e.preventDefault();
    if (!isEdit && (!form.name || !form.email || !form.password)) {
      setError('Името, имейлът и паролата са задължителни'); return;
    }
    if (isEdit && !form.name) { setError('Името е задължително'); return; }
    setSaving(true); setError('');
    try {
      if (isEdit) {
        await api.patch(`/users/${driver.id}`, {
          name: form.name,
          phone: form.phone || null,
          hourlyRate: form.hourlyRate !== '' ? parseFloat(form.hourlyRate) : null,
        });
      } else {
        await api.post('/users', form);
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err.message || 'Грешка при запис');
    } finally {
      setSaving(false);
    }
  }

  const inputCls = 'w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500';
  const labelCls = 'block text-xs font-semibold text-slate-600 mb-1';

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-800 text-lg">
            {isEdit ? `✏️ Редактирай — ${driver.name}` : '👤 Нов шофьор'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className={labelCls}>Имена *</label>
            <input className={inputCls} value={form.name} onChange={e => set('name', e.target.value)} placeholder="Иван Петров" />
          </div>

          {!isEdit && (
            <>
              <div>
                <label className={labelCls}>Имейл *</label>
                <input className={inputCls} type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="ivan@example.com" />
              </div>
              <div>
                <label className={labelCls}>Парола *</label>
                <input className={inputCls} type="password" value={form.password} onChange={e => set('password', e.target.value)} placeholder="Минимум 6 символа" />
              </div>
            </>
          )}

          <div>
            <label className={labelCls}>Телефон</label>
            <input className={inputCls} type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+359888..." />
          </div>

          {isEdit && (
            <div>
              <label className={labelCls}>Часова ставка (€/ч)</label>
              <input className={inputCls} type="number" step="0.01" min="0" value={form.hourlyRate}
                onChange={e => set('hourlyRate', e.target.value)} placeholder="напр. 8.50" />
            </div>
          )}

          {isEdit && (
            <p className="text-xs text-slate-400 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
              Имейлът не може да се промени. За смяна на парола — свържете се с администратор.
            </p>
          )}

          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">
              Откажи
            </button>
            <button type="submit" disabled={saving} className="px-5 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white text-sm font-semibold rounded-lg">
              {saving ? 'Записване...' : isEdit ? '✅ Запази промените' : '✅ Създай шофьор'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const TRIP_STATUS_LABEL = { PLANNED: 'Планиран', IN_PROGRESS: 'В изпълнение', COMPLETED: 'Завършен', PENDING_VERIFICATION: 'Верификация' };
const TRIP_STATUS_COLOR = { PLANNED: 'bg-slate-100 text-slate-600', IN_PROGRESS: 'bg-green-100 text-green-700', COMPLETED: 'bg-blue-100 text-blue-700', PENDING_VERIFICATION: 'bg-amber-100 text-amber-700' };

function StatCard({ label, value, sub, icon, color = 'green' }) {
  const colors = {
    green:  'bg-green-50 text-green-700 border-green-100',
    blue:   'bg-blue-50 text-blue-700 border-blue-100',
    amber:  'bg-amber-50 text-amber-700 border-amber-100',
    red:    'bg-red-50 text-red-700 border-red-100',
    slate:  'bg-slate-50 text-slate-700 border-slate-100',
  };
  return (
    <div className={`rounded-xl border p-4 ${colors[color]}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium opacity-70 mb-1">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
          {sub && <p className="text-xs opacity-60 mt-0.5">{sub}</p>}
        </div>
        <span className="text-xl opacity-60">{icon}</span>
      </div>
    </div>
  );
}

function DriverCard({ driver, onViewMap, onEdit }) {
  const [expanded, setExpanded] = useState(false);
  const { stats, recentTrips, truck } = driver;
  const issueRateColor = stats.issueRate > 10 ? 'red' : stats.issueRate > 5 ? 'amber' : 'green';
  const efficiencyPct = stats.totalTrips > 0 ? Math.round(stats.completedTrips / stats.totalTrips * 100) : 0;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Driver header */}
      <div
        className="p-5 cursor-pointer hover:bg-slate-50 transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <div className="w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-bold flex-shrink-0"
            style={{ background: truck?.color || '#64748b' }}>
            {driver.name.charAt(0)}
          </div>

          {/* Name + truck */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-slate-800">{driver.name}</h3>
              {truck && (
                <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full border border-slate-200">
                  🚛 {truck.plate} · {truck.model}
                </span>
              )}
              <button
                onClick={e => { e.stopPropagation(); onEdit(driver); }}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-green-600 hover:bg-green-50 border border-slate-200 hover:border-green-200 px-2 py-0.5 rounded-full transition-colors"
              >
                <Edit2 className="w-3 h-3" /> Редактирай
              </button>
            </div>
            <p className="text-sm text-slate-500 mt-0.5">{driver.email}
              {driver.phone && <span className="text-slate-400"> · {driver.phone}</span>}
            </p>
            {stats.lastTripDate && (
              <p className="text-xs text-slate-400 mt-0.5">
                Последен курс: {new Date(stats.lastTripDate).toLocaleDateString('bg-BG', { day: 'numeric', month: 'long' })}
              </p>
            )}
          </div>

          {/* Quick stats */}
          <div className="hidden sm:flex items-center gap-6 flex-shrink-0">
            <div className="text-center">
              <div className="text-xl font-bold text-slate-800">{stats.completedTrips}</div>
              <div className="text-xs text-slate-400">курса</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-slate-800">{stats.totalKm}</div>
              <div className="text-xs text-slate-400">км</div>
            </div>
            <div className="text-center">
              <div className={`text-xl font-bold ${stats.issueRate > 10 ? 'text-red-600' : stats.issueRate > 5 ? 'text-amber-600' : 'text-green-600'}`}>
                {stats.issueRate}%
              </div>
              <div className="text-xs text-slate-400">проблеми</div>
            </div>
          </div>

          {/* Efficiency bar */}
          <div className="flex-shrink-0 w-14 hidden lg:block">
            <div className="text-xs text-slate-400 text-right mb-1">{efficiencyPct}%</div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-2 rounded-full bg-green-500 transition-all" style={{ width: `${efficiencyPct}%` }} />
            </div>
          </div>

          <div className="text-slate-400 text-sm">{expanded ? '▲' : '▼'}</div>
        </div>

        {/* Mobile stats */}
        <div className="sm:hidden flex gap-4 mt-3 pt-3 border-t border-slate-100">
          <div className="text-center flex-1">
            <div className="text-lg font-bold text-slate-800">{stats.completedTrips}</div>
            <div className="text-xs text-slate-400">курса</div>
          </div>
          <div className="text-center flex-1">
            <div className="text-lg font-bold text-slate-800">{stats.totalKm}</div>
            <div className="text-xs text-slate-400">км</div>
          </div>
          <div className="text-center flex-1">
            <div className={`text-lg font-bold ${stats.issueRate > 10 ? 'text-red-600' : stats.issueRate > 5 ? 'text-amber-600' : 'text-green-600'}`}>
              {stats.issueRate}%
            </div>
            <div className="text-xs text-slate-400">проблеми</div>
          </div>
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-slate-100">
          {/* Stats grid */}
          <div className="p-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Всички курсове" value={stats.totalTrips} icon="🗺️" color="slate" />
            <StatCard label="Завършени" value={stats.completedTrips} icon="✅" color="green" />
            <StatCard label="Общо км" value={`${stats.totalKm} км`} sub={stats.avgKmPerTrip > 0 ? `средно ${stats.avgKmPerTrip} км/курс` : undefined} icon="📏" color="blue" />
            <StatCard label="Проблемни спирки" value={`${stats.issueRate}%`} sub={`${stats.issueStops} от ${stats.completedStops + stats.issueStops}`} icon="⚠️" color={issueRateColor} />
          </div>

          {/* Last 6 months */}
          <div className="px-5 pb-3">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Последните 6 месеца</p>
            <div className="flex gap-4 text-sm">
              <span className="text-slate-600">{stats.recentTripsCount} курса</span>
              <span className="text-slate-400">·</span>
              <span className="text-slate-600">{stats.recentKm} км</span>
            </div>
          </div>

          {/* Recent trips */}
          {recentTrips.length > 0 && (
            <div className="border-t border-slate-100">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide px-5 pt-4 pb-2">Последни курсове</p>
              <div className="divide-y divide-slate-50">
                {recentTrips.map(trip => (
                  <div key={trip.id} className="flex items-center gap-3 px-5 py-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-slate-700">
                          {new Date(trip.date).toLocaleDateString('bg-BG', { day: 'numeric', month: 'short' })}
                        </span>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${TRIP_STATUS_COLOR[trip.status] || 'bg-slate-100 text-slate-600'}`}>
                          {TRIP_STATUS_LABEL[trip.status] || trip.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {trip.completedStops}/{trip.stopsCount} спирки
                        {trip.totalKm ? ` · ${trip.totalKm} км` : ''}
                        {trip.disposalSite ? ` · ${trip.disposalSite}` : ''}
                      </p>
                    </div>
                    {trip.status !== 'PLANNED' && (
                      <button
                        onClick={() => onViewMap(trip.id)}
                        className="text-xs text-green-600 hover:text-green-700 font-medium px-2 py-1 rounded-lg hover:bg-green-50 transition-colors flex-shrink-0"
                      >
                        Виж на карта →
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Drivers() {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editingDriver, setEditingDriver] = useState(null);
  const navigate = useNavigate();

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get('/analytics/drivers');
      setDrivers(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function viewOnMap(tripId) {
    navigate(`/dispatcher/map?trip=${tripId}`);
  }

  // Aggregate fleet stats
  const totalKm     = drivers.reduce((s, d) => s + (d.stats?.totalKm || 0), 0);
  const totalTrips  = drivers.reduce((s, d) => s + (d.stats?.completedTrips || 0), 0);
  const totalStops  = drivers.reduce((s, d) => s + (d.stats?.completedStops || 0), 0);
  const avgIssueRate = drivers.length > 0
    ? Math.round(drivers.reduce((s, d) => s + (d.stats?.issueRate || 0), 0) / drivers.length)
    : 0;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Шофьори</h1>
          <p className="text-slate-500 text-sm mt-0.5">Статистики и представяне на флота</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load}
            className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-500 hover:bg-slate-50 bg-white transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors shadow-sm">
            <Plus className="w-4 h-4" /> Нов шофьор
          </button>
        </div>
      </div>

      {showCreate && <DriverModal onClose={() => setShowCreate(false)} onSaved={load} />}
      {editingDriver && <DriverModal driver={editingDriver} onClose={() => setEditingDriver(null)} onSaved={load} />}

      {loading ? (
        <div className="flex justify-center py-20">
          <RefreshCw className="w-6 h-6 text-green-600 animate-spin" />
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center text-red-700">
          <p className="font-medium">Грешка при зареждане</p>
          <p className="text-sm mt-1">{error}</p>
          <button onClick={load} className="mt-3 text-sm underline">Опитай отново</button>
        </div>
      ) : (
        <>
          {/* Fleet summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
              <div className="text-3xl font-bold text-slate-800">{drivers.length}</div>
              <div className="text-sm text-slate-500 mt-1">Активни шофьори</div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
              <div className="text-3xl font-bold text-green-600">{totalTrips}</div>
              <div className="text-sm text-slate-500 mt-1">Завършени курса</div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
              <div className="text-3xl font-bold text-blue-600">{Math.round(totalKm)}</div>
              <div className="text-sm text-slate-500 mt-1">Общо км</div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
              <div className={`text-3xl font-bold ${avgIssueRate > 10 ? 'text-red-600' : avgIssueRate > 5 ? 'text-amber-600' : 'text-green-600'}`}>
                {avgIssueRate}%
              </div>
              <div className="text-sm text-slate-500 mt-1">Ср. % проблеми</div>
            </div>
          </div>

          {/* Driver cards */}
          <div className="space-y-4">
            {drivers.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
                <div className="text-5xl mb-4">🚛</div>
                <p className="font-semibold text-slate-700 mb-2">Няма шофьори</p>
                <p className="text-slate-400 text-sm">Добавете шофьори в системата</p>
              </div>
            ) : (
              drivers
                .sort((a, b) => (b.stats?.completedTrips || 0) - (a.stats?.completedTrips || 0))
                .map(driver => (
                  <DriverCard key={driver.id} driver={driver} onViewMap={viewOnMap} onEdit={setEditingDriver} />
                ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
