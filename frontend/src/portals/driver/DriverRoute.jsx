import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../lib/api';
import { socket, connectSocket } from '../../lib/socket';
import { useAuth } from '../../lib/auth';
import { AlertTriangle, ArrowUpFromLine, CheckCircle, ChevronRight, Factory, Locate, LocateOff, MapPin, Navigation, Package, RefreshCw, Truck } from 'lucide-react';
import { useToast } from '../../components/ui';

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

const STOP_TYPE_ICON = { DELIVERY: Package, PICKUP: ArrowUpFromLine, SWAP: RefreshCw, LOAD: Truck, UNLOAD: Factory };
const StopGlyph = ({ type, size = 16, className = '' }) => {
  const I = STOP_TYPE_ICON[type] || MapPin;
  return <I size={size} strokeWidth={2} className={className} />;
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
 amber: 'bg-warn-soft text-warn border-amber-200',
 blue: 'bg-info-soft text-info border-blue-200',
 purple: 'bg-purple-50 text-purple-700 border-purple-200',
 slate: 'bg-raised text-ink border-line',
 }[color];
 return (
 <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded border ${palette}`}>
 <StopGlyph type={stopType} size={13} className="shrink-0" /> {STOP_TYPE_LABEL[stopType]}
 </span>
 );
}

export default function DriverRoute() {
  const { toast, confirm } = useToast();
 const { user } = useAuth();
 const [trips, setTrips] = useState([]);
 const [loading, setLoading] = useState(true);
 const [activeStop, setActiveStop] = useState(null);
 const [issueMode, setIssueMode] = useState(false);
 const [issueNote, setIssueNote] = useState('');
 const [customNote, setCustomNote] = useState('');
 const [updating, setUpdating] = useState(false);
 const [gpsStatus, setGpsStatus] = useState('idle'); // idle | active | denied | error
 const watchIdRef = useRef(null);

 // Start/stop geolocation tracking based on active trip
 useEffect(() => {
 const hasActive = trips.some(t => t.status === 'IN_PROGRESS');
 if (hasActive && watchIdRef.current === null) {
 startGps();
 } else if (!hasActive && watchIdRef.current !== null) {
 stopGps();
 }
 return () => stopGps();
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [trips]);

 function startGps() {
 if (!navigator.geolocation) { setGpsStatus('error'); return; }
 setGpsStatus('active');
 const activeTrip = trips.find(t => t.status === 'IN_PROGRESS');
 watchIdRef.current = navigator.geolocation.watchPosition(
 (pos) => {
 socket.emit('driver_position', {
 truckId: activeTrip?.truck?.id || user?.id,
 plate: activeTrip?.truck?.plate || user?.name,
 color: activeTrip?.truck?.color || '#22c55e',
 lat: pos.coords.latitude,
 lng: pos.coords.longitude,
 speed: pos.coords.speed ? Math.round(pos.coords.speed * 3.6) : 0,
 heading: pos.coords.heading,
 });
 setGpsStatus('active');
 },
 (err) => {
 if (err.code === err.PERMISSION_DENIED) setGpsStatus('denied');
 else setGpsStatus('error');
 },
 { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
 );
 }

 function stopGps() {
 if (watchIdRef.current !== null) {
 navigator.geolocation?.clearWatch(watchIdRef.current);
 watchIdRef.current = null;
 setGpsStatus('idle');
 }
 }

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
 toast.error(err.message);
 } finally {
 setUpdating(false);
 }
 }

 async function handleStartTrip(tripId) {
 try {
 await api.patch(`/trips/${tripId}/status`, { status: 'IN_PROGRESS' });
 await loadTrips();
 } catch (err) {
 toast.error(err.message);
 }
 }

 if (loading) return (
 <div className="flex flex-col items-center justify-center h-48 gap-3"><div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin" /><p className="text-ink-2 text-sm">Зареждане на маршрута...</p></div>
 );

 if (trips.length === 0) return (
 <div className="flex flex-col items-center justify-center h-64 gap-4 px-6 text-center"><div className="w-16 h-16 bg-sunken rounded-full flex items-center justify-center"><MapPin size={26} strokeWidth={1.75} className="text-ink-3" /></div><div><h2 className="font-bold text-ink text-lg">Нямате курсове за днес</h2><p className="text-ink-3 text-sm mt-1">Диспечерът ще ви назначи маршрут</p></div></div>
 );

 // GPS status badge shown at top when a trip is active
 const GpsBadge = () => {
 if (gpsStatus === 'idle') return null;
 const cfg = {
 active: { icon: Locate, cls: 'bg-brand-soft border-green-200 text-brand', dot: 'bg-green-500 animate-pulse', label: 'GPS активен — диспечерът вижда позицията ви' },
 denied: { icon: LocateOff, cls: 'bg-danger-soft border-danger/25 text-danger', dot: 'bg-red-400', label: 'GPS достъпът е отказан — разрешете в настройките' },
 error: { icon: LocateOff, cls: 'bg-warn-soft border-amber-200 text-warn', dot: 'bg-amber-400', label: 'GPS грешка — проверете връзката' },
 }[gpsStatus];
 const Icon = cfg.icon;
 return (
 <div className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border text-xs font-medium ${cfg.cls}`}><div className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} /><Icon className="w-3.5 h-3.5 flex-shrink-0" /><span>{cfg.label}</span></div>
 );
 };

 return (
 <div className="p-4 space-y-4 pb-6"><GpsBadge />
 {trips.map(trip => {
 const done = trip.stops.filter(s => s.status === 'COMPLETED').length;
 const nextStop = trip.stops.find(s => s.status === 'PENDING' || s.status === 'ARRIVED');
 const pct = trip.stops.length > 0 ? Math.round(done / trip.stops.length * 100) : 0;

 return (
 <div key={trip.id} className="space-y-3">
 {/* Trip header card */}
 <div className="bg-surface rounded-2xl border border-line p-4 shadow-sm"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
 style={{ background: trip.truck?.color || '#64748b' }}></div><div className="flex-1 min-w-0"><p className="font-bold text-ink">{trip.truck?.plate}</p><p className="text-xs text-ink-2">{trip.truck?.model} · {trip.truck?.capacityM3} м³</p></div>
 {trip.status === 'PLANNED' && (
 <button onClick={() => handleStartTrip(trip.id)}
 className="flex items-center gap-1.5 bg-brand hover:bg-brand-strong text-brand-ink font-semibold text-sm px-3 py-2 rounded-lg transition-colors">
 ▶ Стартирай
 </button>
 )}
 {trip.status === 'IN_PROGRESS' && (
 <span className="text-xs bg-yellow-100 text-yellow-700 border border-yellow-200 font-semibold px-2.5 py-1 rounded-full">
 В изпълнение
 </span>
 )}
 {trip.status === 'COMPLETED' && (
 <span className="text-xs bg-brand-soft text-brand border border-green-200 font-semibold px-2.5 py-1 rounded-full flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Завършен
 </span>
 )}
 </div>

 {/* Progress bar */}
 <div className="mt-4"><div className="flex justify-between text-xs text-ink-2 mb-1.5"><span>Прогрес</span><span className="font-semibold text-ink">{done}/{trip.stops.length} спирки</span></div><div className="h-2.5 bg-sunken rounded-full overflow-hidden"><div className="h-2.5 bg-green-500 rounded-full transition-all duration-700"
 style={{ width: `${pct}%` }} /></div><p className="text-right text-xs text-brand font-medium mt-1">{pct}%</p></div></div>

 {/* Next stop — prominent */}
 {nextStop && trip.status === 'IN_PROGRESS' && (
 <div className="rounded-2xl overflow-hidden shadow-lg"><div className="bg-gradient-to-br from-green-600 to-green-700 p-5 text-white"><p className="text-green-200 text-xs font-bold uppercase tracking-widest mb-2">Следваща спирка</p><div className="flex items-start gap-3"><div className="shrink-0"><StopGlyph type={nextStop.stopType} size={28} className="text-white/90" /></div><div className="flex-1 min-w-0"><p className="font-bold text-lg leading-tight">{nextStop.order?.client?.name || 'Клиент'}</p><p className="text-green-100 text-sm mt-0.5 flex items-center gap-1"><MapPin className="w-3.5 h-3.5 flex-shrink-0" />
 {nextStop.address}
 </p><div className="mt-2 flex flex-wrap gap-1.5"><span className="text-xs bg-surface/20 text-white px-2 py-0.5 rounded-full">
 {STOP_TYPE_LABEL[nextStop.stopType]}
 </span>
 {nextStop.order?.wasteType && (
 <span className="text-xs bg-surface/20 text-white px-2 py-0.5 rounded-full">
 {nextStop.order.wasteType}
 </span>
 )}
 {nextStop.order?.volumeM3 && (
 <span className="text-xs bg-surface/20 text-white px-2 py-0.5 rounded-full">
 {nextStop.order.volumeM3} м³
 </span>
 )}
 </div></div></div>

 {/* Action buttons */}
 <div className="flex gap-2 mt-4"><a href={`https://maps.google.com/?q=${nextStop.lat},${nextStop.lng}`}
 target="_blank" rel="noreferrer"
 className="flex-1 flex items-center justify-center gap-1.5 bg-surface text-brand font-semibold py-2.5 rounded-xl text-sm hover:bg-brand-soft transition-colors"><Navigation className="w-4 h-4" />
 Навигация
 </a>
 {nextStop.status === 'PENDING' && (
 <button onClick={() => updateStop(trip.id, nextStop.id, 'ARRIVED')}
 disabled={updating}
 className="flex-1 flex items-center justify-center gap-1.5 bg-yellow-400 text-yellow-900 font-semibold py-2.5 rounded-xl text-sm hover:bg-yellow-300 transition-colors disabled:opacity-50"><MapPin className="w-4 h-4" />
 Пристигнах
 </button>
 )}
 {nextStop.status === 'ARRIVED' && (
 <><button onClick={() => updateStop(trip.id, nextStop.id, 'COMPLETED')}
 disabled={updating}
 className="flex-1 flex items-center justify-center gap-1.5 bg-surface text-brand font-bold py-2.5 rounded-xl text-sm hover:bg-brand-soft transition-colors disabled:opacity-50"><CheckCircle className="w-4 h-4" />
 Завърши
 </button><button onClick={() => { setActiveStop(nextStop); setIssueMode(true); }}
 className="flex items-center justify-center w-12 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors"><AlertTriangle className="w-5 h-5" /></button></>
 )}
 </div></div></div>
 )}

 {/* All stops list */}
 <div className="bg-surface rounded-2xl border border-line overflow-hidden"><div className="px-4 py-3 border-b border-line"><p className="font-semibold text-ink text-sm">Всички спирки</p></div><div className="divide-y divide-slate-50">
 {trip.stops.map((stop, i) => {
 const isCompleted = stop.status === 'COMPLETED';
 const isIssue = stop.status === 'ISSUE_REPORTED';
 const isCurrent = stop.id === nextStop?.id;

 return (
 <div key={stop.id}
 className={`flex items-center gap-3 p-3 transition-colors ${isCompleted ? 'opacity-50' : isCurrent ? 'bg-brand-soft' : 'hover:bg-raised'}`}><div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${isCompleted ? 'bg-brand-soft text-brand' : isIssue ? 'bg-danger-soft text-danger' : isCurrent ? 'bg-green-500 text-brand-ink' : 'bg-sunken text-ink-2'}`}>
 {isCompleted ? '' : isIssue ? '!' : stop.sequence}
 </div><div className="flex-1 min-w-0"><div className="flex items-center gap-1.5 flex-wrap mb-0.5"><p className="text-sm font-medium text-ink truncate">{stop.order?.client?.name || 'Депо'}</p><StopTypeBadge stopType={stop.stopType} /></div><p className="text-xs text-ink-3 truncate">{stop.address}</p>
 {stop.issueNote && <p className="text-xs text-danger mt-0.5">{stop.issueNote}</p>}
 </div>
 {stop.completedAt && (
 <span className="text-xs text-ink-3 flex-shrink-0">
 {new Date(stop.completedAt).toLocaleTimeString('bg-BG', { hour: '2-digit', minute: '2-digit' })}
 </span>
 )}
 {isCurrent && <ChevronRight className="w-4 h-4 text-green-500 flex-shrink-0" />}
 </div>
 );
 })}
 </div></div></div>
 );
 })}

 {/* Issue report bottom sheet */}
 {issueMode && activeStop && (
 <div className="fixed inset-0 bg-black/60 flex items-end z-50" onClick={() => setIssueMode(false)}><div className="bg-surface w-full rounded-t-3xl p-6 space-y-4 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}><div className="w-12 h-1 bg-slate-200 rounded-full mx-auto mb-2" /><div className="flex items-center gap-3"><div className="w-10 h-10 bg-danger-soft rounded-xl flex items-center justify-center"><AlertTriangle className="w-5 h-5 text-danger" /></div><div><h3 className="font-bold text-ink">Отчети проблем</h3><p className="text-xs text-ink-2 truncate">{activeStop.address}</p></div></div><div className="space-y-2">
 {ISSUE_OPTIONS.map(opt => (
 <button key={opt} type="button"
 onClick={() => setIssueNote(opt)}
 className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-colors ${issueNote === opt ? 'border-red-400 bg-danger-soft text-danger font-medium' : 'border-line text-ink hover:bg-raised'}`}>
 {opt}
 </button>
 ))}
 </div>

 {issueNote === 'Друго' && (
 <textarea
 className="w-full border border-line rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
 rows={3}
 placeholder="Опишете проблема..."
 value={customNote}
 onChange={e => setCustomNote(e.target.value)}
 />
 )}

 <div className="flex gap-3 pt-2"><button onClick={() => { setIssueMode(false); setIssueNote(''); }}
 className="flex-1 border border-line text-ink-2 font-semibold py-3 rounded-xl text-sm hover:bg-raised transition-colors">
 Откажи
 </button><button
 disabled={!issueNote || updating}
 onClick={() => {
 const note = issueNote === 'Друго' ? customNote || 'Друго' : issueNote;
 const tripId = trips.find(t => t.stops.some(s => s.id === activeStop.id))?.id;
 updateStop(tripId, activeStop.id, 'ISSUE_REPORTED', { issueNote: note });
 }}
 className="flex-1 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-bold py-3 rounded-xl text-sm transition-colors">
 {updating ? 'Изпращане...' : 'Потвърди проблем'}
 </button></div></div></div>
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
 { id: 's2', sequence: 2, status: 'ARRIVED', stopType: 'PICKUP', address: 'бул. Цар Освободител 88, Русе', lat: 43.848, lng: 26.025, order: { client: { name: 'ТехноМаркет' }, wasteType: 'Смесени', volumeM3: 4 } },
 { id: 's3', sequence: 3, status: 'PENDING', stopType: 'LOAD', address: 'ж.к. Чародейка, бл. 12, Русе', lat: 43.862, lng: 26.041, order: { client: { name: 'Иван Петров' }, wasteType: 'Домашен ремонт', estimatedKg: 800 } },
 { id: 's4', sequence: 4, status: 'PENDING', stopType: 'UNLOAD', address: 'Депо Липник, Русе', lat: 43.9, lng: 26.0 },
 ]
 }
];
