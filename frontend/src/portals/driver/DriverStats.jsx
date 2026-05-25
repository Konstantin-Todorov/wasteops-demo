import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { RefreshCw } from 'lucide-react';

const TRIP_STATUS_LABEL = { PLANNED: 'Планиран', IN_PROGRESS: 'В изпълнение', COMPLETED: 'Завършен', PENDING_VERIFICATION: 'Верификация' };
const TRIP_STATUS_COLOR = {
  PLANNED: 'bg-slate-100 text-slate-600',
  IN_PROGRESS: 'bg-green-100 text-green-700',
  COMPLETED: 'bg-blue-100 text-blue-700',
  PENDING_VERIFICATION: 'bg-amber-100 text-amber-700',
};

function KpiCard({ label, value, sub, icon, highlight }) {
  return (
    <div className={`rounded-2xl p-4 ${highlight ? 'bg-green-600 text-white' : 'bg-white border border-slate-200'}`}>
      <div className="text-2xl mb-1">{icon}</div>
      <div className={`text-2xl font-bold ${highlight ? 'text-white' : 'text-slate-800'}`}>{value}</div>
      <div className={`text-xs font-medium mt-0.5 ${highlight ? 'text-green-100' : 'text-slate-500'}`}>{label}</div>
      {sub && <div className={`text-xs mt-1 ${highlight ? 'text-green-200' : 'text-slate-400'}`}>{sub}</div>}
    </div>
  );
}

export default function DriverStats() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      // Fetch current driver's trips
      const trips = await api.get('/trips');
      const allStops = trips.flatMap(t => t.stops || []);
      const completedTrips = trips.filter(t => t.status === 'COMPLETED');
      const inProgressTrips = trips.filter(t => t.status === 'IN_PROGRESS');
      const totalKm = trips.reduce((s, t) => s + (t.totalKm || 0), 0);
      const completedStops = allStops.filter(s => s.status === 'COMPLETED').length;
      const issueStops = allStops.filter(s => s.status === 'ISSUE_REPORTED').length;
      const issueRate = allStops.length > 0 ? Math.round(issueStops / allStops.length * 100) : 0;
      const avgKm = completedTrips.length > 0 ? Math.round(totalKm / completedTrips.length * 10) / 10 : 0;

      // Monthly breakdown (last 3 months)
      const now = new Date();
      const months = [0, 1, 2].map(offset => {
        const d = new Date(now.getFullYear(), now.getMonth() - offset, 1);
        const label = d.toLocaleDateString('bg-BG', { month: 'long' });
        const monthTrips = trips.filter(t => {
          const td = new Date(t.date);
          return td.getMonth() === d.getMonth() && td.getFullYear() === d.getFullYear();
        });
        return { label, trips: monthTrips.length, km: Math.round(monthTrips.reduce((s, t) => s + (t.totalKm || 0), 0)) };
      });

      setData({ trips, completedTrips, inProgressTrips, totalKm: Math.round(totalKm * 10) / 10, completedStops, issueStops, issueRate, avgKm, months });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return (
    <div className="flex justify-center items-center py-20">
      <RefreshCw className="w-6 h-6 text-green-600 animate-spin" />
    </div>
  );

  if (error) return (
    <div className="p-6 text-center">
      <p className="text-red-600 font-medium">Грешка при зареждане</p>
      <p className="text-slate-400 text-sm mt-1">{error}</p>
      <button onClick={load} className="mt-3 text-green-600 text-sm underline">Опитай отново</button>
    </div>
  );

  if (!data) return null;

  return (
    <div className="p-4 space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between pt-2">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Моите статистики</h1>
          <p className="text-slate-500 text-sm">{user?.name}</p>
        </div>
        <button onClick={load} className="text-slate-400 hover:text-slate-600 p-2">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-3">
        <KpiCard label="Завършени курса" value={data.completedTrips.length} icon="✅" highlight />
        <KpiCard label="Общо изминати км" value={`${data.totalKm} км`} icon="📏" sub={`средно ${data.avgKm} км/курс`} />
        <KpiCard label="Завършени спирки" value={data.completedStops} icon="📍" />
        <KpiCard
          label="Проблемни спирки"
          value={`${data.issueRate}%`}
          icon={data.issueRate > 10 ? '⚠️' : '✓'}
          sub={`${data.issueStops} от ${data.completedStops + data.issueStops}`}
        />
      </div>

      {/* In progress */}
      {data.inProgressTrips.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <p className="text-sm font-bold text-amber-800 mb-2">🚛 В момента в движение</p>
          {data.inProgressTrips.map(trip => {
            const done = (trip.stops || []).filter(s => s.status === 'COMPLETED').length;
            const total = (trip.stops || []).length;
            const pct = total > 0 ? Math.round(done / total * 100) : 0;
            return (
              <div key={trip.id}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-amber-800 font-medium">{done}/{total} спирки</span>
                  <span className="text-amber-600">{pct}%</span>
                </div>
                <div className="h-2 bg-amber-100 rounded-full overflow-hidden">
                  <div className="h-2 bg-amber-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Monthly breakdown */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <p className="text-sm font-bold text-slate-700 mb-4">Последните 3 месеца</p>
        <div className="space-y-3">
          {data.months.map((m, i) => {
            const maxTrips = Math.max(...data.months.map(x => x.trips), 1);
            const barPct = Math.round(m.trips / maxTrips * 100);
            return (
              <div key={i} className="flex items-center gap-3">
                <div className="w-16 text-xs text-slate-500 capitalize text-right flex-shrink-0">{m.label}</div>
                <div className="flex-1 h-6 bg-slate-100 rounded-lg overflow-hidden relative">
                  <div className="h-6 bg-green-500 rounded-lg transition-all" style={{ width: `${barPct}%` }} />
                  <span className="absolute inset-0 flex items-center px-2 text-xs font-semibold text-slate-700">
                    {m.trips} курса{m.km > 0 ? ` · ${m.km} км` : ''}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent trips */}
      {data.trips.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <p className="text-sm font-bold text-slate-700 px-4 pt-4 pb-3 border-b border-slate-100">Последни курсове</p>
          <div className="divide-y divide-slate-50">
            {data.trips.slice(0, 8).map(trip => {
              const done = (trip.stops || []).filter(s => s.status === 'COMPLETED').length;
              const total = (trip.stops || []).length;
              return (
                <div key={trip.id} className="flex items-center gap-3 px-4 py-3">
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
                      {done}/{total} спирки
                      {trip.totalKm ? ` · ${trip.totalKm} км` : ''}
                      {trip.disposalSite ? ` · ${trip.disposalSite.name}` : ''}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {data.trips.length === 0 && (
        <div className="text-center py-10 text-slate-400">
          <div className="text-4xl mb-3">🗺️</div>
          <p className="font-medium text-slate-600">Все още няма курсове</p>
          <p className="text-sm mt-1">Статистиките ви ще се появят след първия курс</p>
        </div>
      )}
    </div>
  );
}
