import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { socket, connectSocket } from '../../lib/socket';
import { Navigation, CheckCircle, AlertTriangle, Package, Truck, ChevronRight, MapPin } from 'lucide-react';

const STOP_TYPE_LABEL = {
  DELIVERY: 'Доставка на контейнер',
  PICKUP: 'Вземане на контейнер',
  LOAD: 'Товарене',
  UNLOAD: 'Разтоварване в депо',
};

const STOP_TYPE_COLOR = {
  DELIVERY: 'indigo',
  PICKUP: 'amber',
  LOAD: 'blue',
  UNLOAD: 'purple',
};

const STOP_TYPE_ICON = {
  DELIVERY: '📦',
  PICKUP: '🔄',
  LOAD: '🚛',
  UNLOAD: '🏗️',
};

const ISSUE_OPTIONS = [
  'Контейнерът не е на място',
  'Достъпът е блокиран',
  'Неправилно паркирани автомобили',
  'Клиентът не е на място',
  'Надвишено тегло',
  'Контейнерът е наполовина пълен',
  'Друго',
];

function StopTypeBadge({ stopType }) {
  const color = STOP_TYPE_COLOR[stopType] || 'slate';
  const palette = {
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    slate: 'bg-slate-50 text-slate-700 border-slate-200',
  }[color];
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded border ${palette}`}>
      {STOP_TYPE_ICON[stopType]} {STOP_TYPE_LABEL[stopType]}
    </span>
  );
}

export default function DriverRoute() {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeStop, setActiveStop] = useState(null);
  const [issueMode, setIssueMode] = useState(false);
  const [issueNote, setIssueNote] = useState('');
  const [customNote, setCustomNote] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    loadTrips();
    connectSocket();
    socket.on('stop_updated', () => loadTrips());
    socket.on('simulation_complete', () => loadTrips());
    return () => { socket.off('stop_updated'); socket.off('simulation_complete'); };
  }, []);

  async function loadTrips() {
    try {
      const data = await api.get('/trips');
      const today = data.filter(t => {
        const d = new Date(t.date);
        const now = new Date();
        return d.toDateString() === now.toDateString() || t.status === 'IN_PROGRESS';
      });
      setTrips(today);
    } catch {
      setTrips(MOCK_TRIPS);
    }
    setLoading(false);
  }

  async function updateStop(tripId, stopId, status, extra = {}) {
    setUpdating(true);
    try {
      await api.patch(`/trips/${tripId}/stops/${stopId}`, { status, ...extra });
      await loadTrips();
      setActiveStop(null);
      setIssueMode(false);
      setIssueNote('');
      setCustomNote('');
    } catch (err) {
      alert(err.message);
    } finally {
      setUpdating(false);
    }
  }

  async function handleStartTrip(tripId) {
    try {
      await api.patch(`/trips/${tripId}/status`, { status: 'IN_PROGRESS' });
      await loadTrips();
    } catch (err) {
      alert(err.message);
    }
  }

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-48 gap-3">
      <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-slate-500 text-sm">Зареждане на маршрута...</p>
    </div>
  );

  if (trips.length === 0) return (
    <div className="flex flex-col items-center justify-center h-64 gap-4 px-6 text-center">
      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-3xl">🗺️</div>
      <div>
        <h2 className="font-bold text-slate-700 text-lg">Нямате курсове за днес</h2>
        <p className="text-slate-400 text-sm mt-1">Диспечерът ще ви назначи маршрут</p>
      </div>
    </div>
  );

  return (
    <div className="p-4 space-y-4 pb-6">
      {trips.map(trip => {
        const done = trip.stops.filter(s => s.status === 'COMPLETED').length;
        const nextStop = trip.stops.find(s => s.status === 'PENDING' || s.status === 'ARRIVED');
        const pct = trip.stops.length > 0 ? Math.round(done / trip.stops.length * 100) : 0;

        return (
          <div key={trip.id} className="space-y-3">
            {/* Trip header card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                  style={{ background: trip.truck?.color || '#64748b' }}>
                  🚛
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-800">{trip.truck?.plate}</p>
                  <p className="text-xs text-slate-500">{trip.truck?.model} · {trip.truck?.capacityM3} м³</p>
                </div>
                {trip.status === 'PLANNED' && (
                  <button onClick={() => handleStartTrip(trip.id)}
                    className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white font-semibold text-sm px-3 py-2 rounded-lg transition-colors">
                    ▶ Стартирай
                  </button>
                )}
                {trip.status === 'IN_PROGRESS' && (
                  <span className="text-xs bg-yellow-100 text-yellow-700 border border-yellow-200 font-semibold px-2.5 py-1 rounded-full">
                    В изпълнение
                  </span>
                )}
                {trip.status === 'COMPLETED' && (
                  <span className="text-xs bg-green-100 text-green-700 border border-green-200 font-semibold px-2.5 py-1 rounded-full flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> Завършен
                  </span>
                )}
              </div>

              {/* Progress bar */}
              <div className="mt-4">
                <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                  <span>Прогрес</span>
                  <span className="font-semibold text-slate-700">{done}/{trip.stops.length} спирки</span>
                </div>
                <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-2.5 bg-green-500 rounded-full transition-all duration-700"
                    style={{ width: `${pct}%` }} />
                </div>
                <p className="text-right text-xs text-green-600 font-medium mt-1">{pct}%</p>
              </div>
            </div>

            {/* Next stop — prominent */}
            {nextStop && trip.status === 'IN_PROGRESS' && (
              <div className="rounded-2xl overflow-hidden shadow-lg">
                <div className="bg-gradient-to-br from-green-600 to-green-700 p-5 text-white">
                  <p className="text-green-200 text-xs font-bold uppercase tracking-widest mb-2">Следваща спирка</p>
                  <div className="flex items-start gap-3">
                    <div className="text-3xl">{STOP_TYPE_ICON[nextStop.stopType] || '📍'}</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-lg leading-tight">{nextStop.order?.client?.name || 'Клиент'}</p>
                      <p className="text-green-100 text-sm mt-0.5 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                        {nextStop.address}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <span className="text-xs bg-white/20 text-white px-2 py-0.5 rounded-full">
                          {STOP_TYPE_LABEL[nextStop.stopType]}
                        </span>
                        {nextStop.order?.wasteType && (
                          <span className="text-xs bg-white/20 text-white px-2 py-0.5 rounded-full">
                            {nextStop.order.wasteType}
                          </span>
                        )}
                        {nextStop.order?.volumeM3 && (
                          <span className="text-xs bg-white/20 text-white px-2 py-0.5 rounded-full">
                            {nextStop.order.volumeM3} м³
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-2 mt-4">
                    <a href={`https://maps.google.com/?q=${nextStop.lat},${nextStop.lng}`}
                      target="_blank" rel="noreferrer"
                      className="flex-1 flex items-center justify-center gap-1.5 bg-white text-green-700 font-semibold py-2.5 rounded-xl text-sm hover:bg-green-50 transition-colors">
                      <Navigation className="w-4 h-4" />
                      Навигация
                    </a>
                    {nextStop.status === 'PENDING' && (
                      <button onClick={() => updateStop(trip.id, nextStop.id, 'ARRIVED')}
                        disabled={updating}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-yellow-400 text-yellow-900 font-semibold py-2.5 rounded-xl text-sm hover:bg-yellow-300 transition-colors disabled:opacity-50">
                        <MapPin className="w-4 h-4" />
                        Пристигнах
                      </button>
                    )}
                    {nextStop.status === 'ARRIVED' && (
                      <>
                        <button onClick={() => updateStop(trip.id, nextStop.id, 'COMPLETED')}
                          disabled={updating}
                          className="flex-1 flex items-center justify-center gap-1.5 bg-white text-green-700 font-bold py-2.5 rounded-xl text-sm hover:bg-green-50 transition-colors disabled:opacity-50">
                          <CheckCircle className="w-4 h-4" />
                          Завърши
                        </button>
                        <button onClick={() => { setActiveStop(nextStop); setIssueMode(true); }}
                          className="flex items-center justify-center w-12 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors">
                          <AlertTriangle className="w-5 h-5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* All stops list */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100">
                <p className="font-semibold text-slate-700 text-sm">Всички спирки</p>
              </div>
              <div className="divide-y divide-slate-50">
                {trip.stops.map((stop, i) => {
                  const isCompleted = stop.status === 'COMPLETED';
                  const isIssue = stop.status === 'ISSUE_REPORTED';
                  const isCurrent = stop.id === nextStop?.id;

                  return (
                    <div key={stop.id}
                      className={`flex items-center gap-3 p-3 transition-colors ${isCompleted ? 'opacity-50' : isCurrent ? 'bg-green-50' : 'hover:bg-slate-50'}`}>
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${isCompleted ? 'bg-green-100 text-green-600' : isIssue ? 'bg-red-100 text-red-600' : isCurrent ? 'bg-green-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                        {isCompleted ? '✓' : isIssue ? '!' : stop.sequence}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                          <p className="text-sm font-medium text-slate-800 truncate">{stop.order?.client?.name || 'Депо'}</p>
                          <StopTypeBadge stopType={stop.stopType} />
                        </div>
                        <p className="text-xs text-slate-400 truncate">{stop.address}</p>
                        {stop.issueNote && <p className="text-xs text-red-500 mt-0.5">⚠️ {stop.issueNote}</p>}
                      </div>
                      {stop.completedAt && (
                        <span className="text-xs text-slate-400 flex-shrink-0">
                          {new Date(stop.completedAt).toLocaleTimeString('bg-BG', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                      {isCurrent && <ChevronRight className="w-4 h-4 text-green-500 flex-shrink-0" />}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })}

      {/* Issue report bottom sheet */}
      {issueMode && activeStop && (
        <div className="fixed inset-0 bg-black/60 flex items-end z-50" onClick={() => setIssueMode(false)}>
          <div className="bg-white w-full rounded-t-3xl p-6 space-y-4 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto mb-2" />
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800">Отчети проблем</h3>
                <p className="text-xs text-slate-500 truncate">{activeStop.address}</p>
              </div>
            </div>

            <div className="space-y-2">
              {ISSUE_OPTIONS.map(opt => (
                <button key={opt} type="button"
                  onClick={() => setIssueNote(opt)}
                  className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-colors ${issueNote === opt ? 'border-red-400 bg-red-50 text-red-700 font-medium' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
                  {opt}
                </button>
              ))}
            </div>

            {issueNote === 'Друго' && (
              <textarea
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
                rows={3}
                placeholder="Опишете проблема..."
                value={customNote}
                onChange={e => setCustomNote(e.target.value)}
              />
            )}

            <div className="flex gap-3 pt-2">
              <button onClick={() => { setIssueMode(false); setIssueNote(''); }}
                className="flex-1 border border-slate-200 text-slate-600 font-semibold py-3 rounded-xl text-sm hover:bg-slate-50 transition-colors">
                Откажи
              </button>
              <button
                disabled={!issueNote || updating}
                onClick={() => {
                  const note = issueNote === 'Друго' ? customNote || 'Друго' : issueNote;
                  const tripId = trips.find(t => t.stops.some(s => s.id === activeStop.id))?.id;
                  updateStop(tripId, activeStop.id, 'ISSUE_REPORTED', { issueNote: note });
                }}
                className="flex-1 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-bold py-3 rounded-xl text-sm transition-colors">
                {updating ? 'Изпращане...' : 'Потвърди проблем'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const MOCK_TRIPS = [
  {
    id: 'mock1',
    status: 'IN_PROGRESS',
    date: new Date().toISOString(),
    truck: { plate: 'PB 1234 AB', model: 'Mercedes Actros', capacityM3: 10, color: '#3b82f6' },
    stops: [
      { id: 's1', sequence: 1, status: 'COMPLETED', stopType: 'DELIVERY', address: 'ул. Борисова 45, Русе', lat: 43.855, lng: 26.032, order: { client: { name: 'Строй ЕООД' }, wasteType: 'Строителни', volumeM3: 7 }, completedAt: new Date(Date.now() - 3600000).toISOString() },
      { id: 's2', sequence: 2, status: 'ARRIVED',   stopType: 'PICKUP',   address: 'бул. Цар Освободител 88, Русе', lat: 43.848, lng: 26.025, order: { client: { name: 'ТехноМаркет' }, wasteType: 'Смесени', volumeM3: 4 } },
      { id: 's3', sequence: 3, status: 'PENDING',   stopType: 'LOAD',     address: 'ж.к. Чародейка, бл. 12, Русе', lat: 43.862, lng: 26.041, order: { client: { name: 'Иван Петров' }, wasteType: 'Домашен ремонт', estimatedKg: 800 } },
      { id: 's4', sequence: 4, status: 'PENDING',   stopType: 'UNLOAD',   address: 'Депо Липник, Русе', lat: 43.9, lng: 26.0 },
    ]
  }
];
