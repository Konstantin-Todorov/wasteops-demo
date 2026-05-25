import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import StatusBadge from '../../components/shared/StatusBadge';
import { Plus, ChevronDown, ChevronUp, Truck, RefreshCw, MapPin, AlertTriangle, CheckCircle, Clock, Package, X, Map as MapIcon } from 'lucide-react';

const STOP_TYPE_LABEL = { DELIVERY: 'Доставка контейнер', PICKUP: 'Вземане контейнер', LOAD: 'Товарене', UNLOAD: 'Разтоварване' };
const STOP_TYPE_ICON  = { DELIVERY: '📦', PICKUP: '🔄', LOAD: '🚛', UNLOAD: '🏗️' };
const STOP_STATUS_COLOR = { COMPLETED: 'bg-green-100 text-green-700', ARRIVED: 'bg-amber-100 text-amber-700', PENDING: 'bg-slate-100 text-slate-600', ISSUE_REPORTED: 'bg-red-100 text-red-700' };
const TRIP_STATUS_LABEL = { PLANNED: 'Планиран', IN_PROGRESS: 'В изпълнение', COMPLETED: 'Завършен', PENDING_VERIFICATION: 'Верификация' };

const CONFIRMED_STATUSES = ['CONFIRMED', 'AWAITING_FILL'];

export default function Trips() {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const navigate = useNavigate();

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try { setTrips(await api.get('/trips')); }
    catch { setTrips([]); }
    finally { setLoading(false); }
  }

  const today  = trips.filter(t => new Date(t.date).toDateString() === new Date().toDateString() || t.status === 'IN_PROGRESS');
  const past   = trips.filter(t => t.status === 'COMPLETED' && new Date(t.date).toDateString() !== new Date().toDateString());
  const future = trips.filter(t => t.status === 'PLANNED' && new Date(t.date) > new Date() && new Date(t.date).toDateString() !== new Date().toDateString());

  // Compute fleet stats for today (safe with optional stops)
  const todayTotalStops = today.reduce((s, t) => s + (t.stops?.length || 0), 0);
  const todayDoneStops  = today.reduce((s, t) => s + (t.stops?.filter(st => st.status === 'COMPLETED').length || 0), 0);
  const todayKm         = today.reduce((s, t) => s + (t.totalKm || 0), 0);
  const inProgressCount = today.filter(t => t.status === 'IN_PROGRESS').length;
  const issueCount      = today.reduce((s, t) => s + (t.stops?.filter(st => st.status === 'ISSUE_REPORTED').length || 0), 0);
  const todayPct        = todayTotalStops > 0 ? Math.round(todayDoneStops / todayTotalStops * 100) : 0;
  const trucks = [...new Map(today.filter(t => t.truck).map(t => [t.truck.id, t.truck])).values()];

  return (
    <div className="p-6 flex gap-6">
      {/* Main trip list */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Курсове</h1>
            <p className="text-slate-500 text-sm mt-0.5">Управление на маршрути и оптимизация</p>
          </div>
          <div className="flex gap-2">
            <button onClick={load} className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-500 hover:bg-slate-50 bg-white transition-colors">
              <RefreshCw className="w-4 h-4" />
            </button>
            <button onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors shadow-sm">
              <Plus className="w-4 h-4" />
              Нов курс
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><RefreshCw className="w-6 h-6 text-green-600 animate-spin" /></div>
        ) : (
          <div className="space-y-8">
            <TripGroup label="Днес" trips={today} expanded={expanded} onToggle={setExpanded} onRefresh={load} onMap={id => navigate(`/dispatcher/map?trip=${id}`)} />
            {future.length > 0 && <TripGroup label="Предстоящи" trips={future} expanded={expanded} onToggle={setExpanded} onRefresh={load} onMap={id => navigate(`/dispatcher/map?trip=${id}`)} />}
            {past.length > 0 && <TripGroup label="Приключили" trips={past} expanded={expanded} onToggle={setExpanded} onRefresh={load} onMap={id => navigate(`/dispatcher/map?trip=${id}`)} />}

            {trips.length === 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
                <div className="text-5xl mb-4">🗺️</div>
                <p className="font-semibold text-slate-700 mb-2">Няма курсове</p>
                <p className="text-slate-400 text-sm mb-4">Потвърдете заявки и създайте нов курс</p>
                <button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-2 bg-green-600 text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-green-700 transition-colors">
                  <Plus className="w-4 h-4" /> Нов курс
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right sidebar — fleet overview */}
      <div className="w-72 flex-shrink-0 space-y-4">

        {/* Today's progress */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500" /> Ден в цифри
          </h3>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-500">Спирки завършени</span>
                <span className="font-bold text-slate-700">{todayDoneStops}/{todayTotalStops}</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-2 bg-green-500 rounded-full transition-all" style={{ width: `${todayPct}%` }} />
              </div>
              <div className="text-right text-[10px] text-slate-400 mt-0.5">{todayPct}% изпълнено</div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="bg-slate-50 rounded-xl p-3 text-center">
                <div className="text-xl font-black text-slate-800">{today.length}</div>
                <div className="text-[10px] text-slate-500">курса днес</div>
              </div>
              <div className="bg-green-50 rounded-xl p-3 text-center">
                <div className="text-xl font-black text-green-700">{inProgressCount}</div>
                <div className="text-[10px] text-green-600">в движение</div>
              </div>
              <div className="bg-blue-50 rounded-xl p-3 text-center">
                <div className="text-xl font-black text-blue-700">{Math.round(todayKm)}</div>
                <div className="text-[10px] text-blue-600">км изминати</div>
              </div>
              <div className={`rounded-xl p-3 text-center ${issueCount > 0 ? 'bg-red-50' : 'bg-slate-50'}`}>
                <div className={`text-xl font-black ${issueCount > 0 ? 'text-red-600' : 'text-slate-400'}`}>{issueCount}</div>
                <div className={`text-[10px] ${issueCount > 0 ? 'text-red-500' : 'text-slate-400'}`}>проблема</div>
              </div>
            </div>
          </div>
        </div>

        {/* Fleet status */}
        {trucks.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
              <span className="text-base">🚛</span> Флот днес
            </h3>
            <div className="space-y-2">
              {trucks.map(truck => {
                const truckTrips = today.filter(t => t.truck?.id === truck.id);
                const done = truckTrips.reduce((s, t) => s + (t.stops?.filter(st => st.status === 'COMPLETED').length || 0), 0);
                const total = truckTrips.reduce((s, t) => s + (t.stops?.length || 0), 0);
                const pct = total > 0 ? Math.round(done / total * 100) : 0;
                const active = truckTrips.some(t => t.status === 'IN_PROGRESS');
                return (
                  <div key={truck.id} className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-100 hover:bg-slate-50">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: truck.color || '#64748b' }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-800">{truck.plate}</span>
                        {active && <span className="text-[9px] bg-green-100 text-green-700 px-1 py-0.5 rounded-full font-medium">В движение</span>}
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full mt-1 overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: truck.color || '#64748b' }} />
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-400 flex-shrink-0">{done}/{total}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* VRP info box */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
          <div className="flex items-start gap-2">
            <span className="text-lg flex-shrink-0">🗺️</span>
            <div>
              <p className="text-xs font-bold text-emerald-800 mb-1">VRP оптимизация</p>
              <p className="text-[11px] text-emerald-700 leading-relaxed">
                Спирките са наредени с алгоритъм nearest-neighbor + 2-opt за минимален маршрут.
                Разгънете курс за да видите спестяванията спрямо произволен ред.
              </p>
            </div>
          </div>
        </div>
      </div>

      {showCreate && <CreateTripModal onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); load(); }} />}
    </div>
  );
}

function TripGroup({ label, trips, expanded, onToggle, onRefresh, onMap }) {
  if (trips.length === 0) return null;
  return (
    <div>
      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">{label} ({trips.length})</p>
      <div className="space-y-4">
        {trips.map(trip => <TripCard key={trip.id} trip={trip} expanded={expanded === trip.id} onToggle={() => onToggle(expanded === trip.id ? null : trip.id)} onRefresh={onRefresh} onMap={onMap} />)}
      </div>
    </div>
  );
}

function TripCard({ trip, expanded, onToggle, onRefresh, onMap }) {
  const [savings, setSavings] = useState(null);
  const [savingsLoading, setSavingsLoading] = useState(false);
  const [localStops, setLocalStops] = useState(null);
  const [dragIdx, setDragIdx] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const stops = localStops ?? [...(trip.stops || [])].sort((a, b) => a.sequence - b.sequence);
  const done   = (trip.stops || []).filter(s => s.status === 'COMPLETED').length;
  const issues = (trip.stops || []).filter(s => s.status === 'ISSUE_REPORTED').length;
  const pct    = trip.stops?.length > 0 ? Math.round(done / trip.stops.length * 100) : 0;
  const color  = trip.truck?.color || '#64748b';
  const isDirty = localStops !== null;

  useEffect(() => {
    if (!expanded || savings !== null) return;
    setSavingsLoading(true);
    api.get(`/trips/${trip.id}/route`)
      .then(d => setSavings(d))
      .catch(() => setSavings(null))
      .finally(() => setSavingsLoading(false));
  }, [expanded]);

  // Reset local stops when trip changes from outside
  useEffect(() => { setLocalStops(null); setSaved(false); }, [trip.id]);

  function togglePriority(stopId) {
    setLocalStops(prev => {
      const base = prev ?? [...(trip.stops || [])].sort((a, b) => a.sequence - b.sequence);
      const updated = base.map(s => s.id === stopId ? { ...s, priority: !s.priority } : s);
      // Priority pending stops float to top, maintaining relative order within each group
      const canReorder = updated.filter(s => s.status === 'PENDING');
      const locked     = updated.filter(s => s.status !== 'PENDING');
      const prioritized  = canReorder.filter(s => s.priority);
      const normal       = canReorder.filter(s => !s.priority);
      const reordered = [...prioritized, ...normal];
      // Reassign sequences only for pending stops
      let seq = 1;
      const result = [];
      for (const s of updated) {
        if (s.status !== 'PENDING') { result.push(s); continue; }
        const found = reordered.find(r => r.id === s.id);
        result.push({ ...found, sequence: seq++ });
      }
      // Fix sequences for non-pending (keep original relative order)
      const pendingSeqUsed = seq - 1;
      let nonPendingSeq = pendingSeqUsed + 1;
      return result.map(s => s.status !== 'PENDING' ? { ...s, sequence: nonPendingSeq++ } : s)
                   .sort((a, b) => a.sequence - b.sequence);
    });
    setSaved(false);
  }

  function onDragStart(e, idx) {
    if (stops[idx].status !== 'PENDING') { e.preventDefault(); return; }
    setDragIdx(idx);
    e.dataTransfer.effectAllowed = 'move';
  }

  function onDragOver(e, idx) {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    if (stops[idx].status !== 'PENDING') return;
    // Don't allow dragging over priority stops if the dragged stop is not priority
    if (stops[idx].priority && !stops[dragIdx]?.priority) return;
    setLocalStops(prev => {
      const base = prev ?? [...(trip.stops || [])].sort((a, b) => a.sequence - b.sequence);
      const arr = [...base];
      const [moved] = arr.splice(dragIdx, 1);
      arr.splice(idx, 0, moved);
      setDragIdx(idx);
      return arr.map((s, i) => ({ ...s, sequence: i + 1 }));
    });
    setSaved(false);
  }

  function onDragEnd() { setDragIdx(null); }

  async function saveOrder() {
    setSaving(true);
    try {
      const payload = stops.map(s => ({ id: s.id, sequence: s.sequence, priority: s.priority ?? false }));
      await api.patch(`/trips/${trip.id}/stops/reorder`, { stops: payload });
      setSaved(true);
      setSaving(false);
      setSavings(null); // force re-fetch of route comparison
      setTimeout(() => { setSaved(false); onRefresh(); }, 1500);
    } catch (e) {
      alert(e.message || 'Грешка при запис');
      setSaving(false);
    }
  }

  function resetOrder() {
    setLocalStops(null);
    setSaved(false);
  }

  const STATUS_STYLE = {
    PLANNED:              'bg-slate-100 text-slate-700 border-slate-200',
    IN_PROGRESS:          'bg-green-100 text-green-700 border-green-200',
    COMPLETED:            'bg-blue-100 text-blue-700 border-blue-200',
    PENDING_VERIFICATION: 'bg-amber-100 text-amber-700 border-amber-200',
  };

  return (
    <div className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${issues > 0 ? 'border-red-200' : 'border-slate-200'}`}>
      {/* Card header */}
      <div className="p-4 cursor-pointer" onClick={onToggle}>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ background: color }} />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-slate-800">{trip.truck?.plate}</span>
              <span className="text-slate-400 text-sm">·</span>
              <span className="text-sm text-slate-600">{trip.truck?.model}</span>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${STATUS_STYLE[trip.status] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                {TRIP_STATUS_LABEL[trip.status] || trip.status}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-400 flex-wrap">
              <span>👤 {trip.truck?.driver?.name || '—'}</span>
              <span>🗓️ {new Date(trip.date).toLocaleDateString('bg-BG', { day: 'numeric', month: 'short' })}</span>
              {trip.disposalSite && <span>🏗️ {trip.disposalSite.name}</span>}
              {trip.totalKm && <span>📏 {trip.totalKm} км</span>}
            </div>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="text-right">
              <div className="text-lg font-bold text-slate-800">{done}/{trip.stops?.length ?? 0}</div>
              <div className="text-xs text-slate-400">спирки</div>
            </div>
            <div className="w-16">
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
              </div>
              <div className="text-xs text-right mt-0.5 font-medium" style={{ color }}>{pct}%</div>
            </div>
          </div>

          {issues > 0 && (
            <div className="flex items-center gap-1 bg-red-100 text-red-700 border border-red-200 text-xs font-semibold px-2 py-1 rounded-lg flex-shrink-0">
              <AlertTriangle className="w-3.5 h-3.5" />
              {issues} проблем
            </div>
          )}

          <button onClick={e => { e.stopPropagation(); onMap(trip.id); }}
            className="flex items-center gap-1.5 text-xs font-semibold text-green-600 hover:text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 px-2.5 py-1.5 rounded-lg transition-colors flex-shrink-0">
            <MapIcon className="w-3.5 h-3.5" /> Карта
          </button>

          <button className="text-slate-400 flex-shrink-0">
            {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Expanded stops */}
      {expanded && (
        <div className="border-t border-slate-100">
          {/* Toolbar */}
          <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between gap-3">
            <p className="text-xs text-slate-500">
              <span className="font-semibold">Drag-and-drop</span> за ръчна наредба ·
              <span className="text-red-600 font-semibold"> 🚨 Спешна</span> — задължително първа спирка
            </p>
            {isDirty && (
              <div className="flex gap-2 flex-shrink-0">
                <button onClick={resetOrder} className="text-xs text-slate-500 hover:text-slate-700 px-2 py-1 border border-slate-200 rounded-lg bg-white">
                  Нулирай
                </button>
                <button onClick={saveOrder} disabled={saving || saved}
                  className={`text-xs font-semibold px-3 py-1 rounded-lg transition-colors flex items-center gap-1.5 ${saved ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-green-600 text-white hover:bg-green-700'}`}>
                  {saved ? '✓ Запазено' : saving ? 'Запазване...' : '💾 Запази ред'}
                </button>
              </div>
            )}
          </div>

          {/* Savings banner */}
          {savingsLoading && (
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center gap-2 text-xs text-slate-400">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Изчисляване на маршрут...
            </div>
          )}

          {/* Manual reorder vs VRP comparison */}
          {savings && savings.isManuallyReordered && (
            savings.manualVsVrpKm > 0 ? (
              <div className="px-4 py-3 bg-amber-50 border-b border-amber-200">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-base">⚠️</span>
                    <span className="text-sm font-bold text-amber-800">Ръчен ред — по-дълъг от VRP оптималния</span>
                  </div>
                  <button
                    onClick={() => {
                      if (!savings.vrpStopOrder) return;
                      setLocalStops(prev => {
                        const base = prev ?? [...(trip.stops || [])].sort((a, b) => a.sequence - b.sequence);
                        const pending = base.filter(s => s.status === 'PENDING');
                        const locked  = base.filter(s => s.status !== 'PENDING');
                        const reordered = savings.vrpStopOrder
                          .map(id => pending.find(s => s.id === id))
                          .filter(Boolean);
                        // append any pending stops not in vrpStopOrder (shouldn't happen)
                        pending.forEach(s => { if (!reordered.find(r => r.id === s.id)) reordered.push(s); });
                        let seq = 1;
                        const result = [...reordered.map(s => ({ ...s, priority: false, sequence: seq++ })), ...locked.map(s => ({ ...s, sequence: seq++ }))];
                        return result;
                      });
                      setSaved(false);
                    }}
                    className="flex-shrink-0 text-xs font-bold px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors whitespace-nowrap"
                  >
                    ✦ Приложи VRP ред
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className="bg-white rounded-lg py-1.5 px-1 border border-amber-100">
                    <div className="text-base font-black text-slate-700">{savings.currentKm} км</div>
                    <div className="text-[10px] text-slate-500">ваш ред</div>
                  </div>
                  <div className="bg-white rounded-lg py-1.5 px-1 border border-emerald-100">
                    <div className="text-base font-black text-emerald-600">{savings.vrpKm} км</div>
                    <div className="text-[10px] text-emerald-600">VRP оптим.</div>
                  </div>
                  <div className="bg-red-50 rounded-lg py-1.5 px-1 border border-red-100">
                    <div className="text-base font-black text-red-600">+{savings.manualVsVrpKm} км</div>
                    <div className="text-[10px] text-red-500">излишни</div>
                  </div>
                  <div className="bg-red-50 rounded-lg py-1.5 px-1 border border-red-100">
                    <div className="text-base font-black text-red-600">+€{savings.manualVsVrpEur}</div>
                    <div className="text-[10px] text-red-500">допълнит.</div>
                  </div>
                </div>
                <p className="text-[10px] text-amber-600 mt-1.5 text-center">
                  ≈ +{savings.manualVsVrpFuelL} л гориво повече · Натисни "Приложи VRP ред" за оптимален маршрут
                </p>
              </div>
            ) : (
              <div className="px-4 py-3 bg-emerald-50 border-b border-emerald-100">
                <div className="flex items-center gap-1.5">
                  <span className="text-base">✅</span>
                  <span className="text-sm font-bold text-emerald-800">Ръчният ред е по-добър или равен на VRP</span>
                </div>
                <p className="text-[10px] text-emerald-600 mt-1">
                  {savings.currentKm} км ваш · {savings.vrpKm} км VRP оптимален · Добра работа!
                </p>
              </div>
            )
          )}

          {/* Standard VRP vs naive savings (when not manually reordered) */}
          {savings && !savings.isManuallyReordered && savings.savingPercent > 0 && (
            <div className="px-4 py-3 bg-emerald-50 border-b border-emerald-100">
              <div className="flex items-center gap-1.5 mb-2">
                <span className="text-lg">💡</span>
                <span className="text-sm font-bold text-emerald-800">VRP оптимизация vs произволен ред</span>
              </div>
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="bg-white rounded-lg py-1.5 px-1">
                  <div className="text-base font-black text-emerald-600">{savings.savingPercent}%</div>
                  <div className="text-[10px] text-emerald-700">спестено</div>
                </div>
                <div className="bg-white rounded-lg py-1.5 px-1">
                  <div className="text-base font-black text-slate-700">{savings.savedKm} км</div>
                  <div className="text-[10px] text-slate-500">по-малко</div>
                </div>
                <div className="bg-white rounded-lg py-1.5 px-1">
                  <div className="text-base font-black text-blue-600">{savings.fuelSavedL} л</div>
                  <div className="text-[10px] text-blue-700">гориво</div>
                </div>
                <div className="bg-white rounded-lg py-1.5 px-1">
                  <div className="text-base font-black text-purple-600">€{savings.fuelSavedEur ?? '-'}</div>
                  <div className="text-[10px] text-purple-700">спестени</div>
                </div>
              </div>
              <p className="text-[10px] text-emerald-600 mt-1.5 text-center">{savings.optimizedKm} км оптимален · {savings.naiveKm} км при поредния ред на заявките</p>
            </div>
          )}

          {/* Stops list with drag-and-drop */}
          <div>
            {stops.map((stop, i) => {
              const canDrag = stop.status === 'PENDING';
              const isDragging = dragIdx === i;
              return (
                <div
                  key={stop.id}
                  draggable={canDrag}
                  onDragStart={e => onDragStart(e, i)}
                  onDragOver={e => onDragOver(e, i)}
                  onDragEnd={onDragEnd}
                  className={`flex items-center gap-3 px-4 py-3 border-b border-slate-50 last:border-0 transition-all
                    ${stop.status === 'ISSUE_REPORTED' ? 'bg-red-50' : ''}
                    ${stop.priority && stop.status === 'PENDING' ? 'bg-red-50 border-l-4 border-l-red-400' : ''}
                    ${isDragging ? 'opacity-40' : ''}
                    ${canDrag ? 'cursor-grab active:cursor-grabbing' : ''}
                  `}
                >
                  {/* Drag handle */}
                  <div className={`flex-shrink-0 text-slate-300 text-lg leading-none select-none ${canDrag ? 'cursor-grab' : 'opacity-0'}`}>⠿</div>

                  {/* Sequence bubble */}
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 text-white"
                    style={{ background: stop.priority && stop.status === 'PENDING' ? '#ef4444' : stop.status === 'COMPLETED' ? '#10b981' : stop.status === 'ARRIVED' ? '#f59e0b' : stop.status === 'ISSUE_REPORTED' ? '#ef4444' : '#94a3b8' }}>
                    {stop.status === 'COMPLETED' ? '✓' : stop.status === 'ISSUE_REPORTED' ? '!' : stop.priority ? '🚨' : stop.sequence}
                  </div>

                  {/* Stop type icon */}
                  <span className="text-base flex-shrink-0">{STOP_TYPE_ICON[stop.stopType]}</span>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-slate-800 truncate">{stop.order?.client?.name || 'Депо'}</span>
                      {stop.priority && stop.status === 'PENDING' && (
                        <span className="text-xs bg-red-100 text-red-700 border border-red-200 px-1.5 py-0.5 rounded-full font-semibold">🚨 Спешна</span>
                      )}
                      <span className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">{STOP_TYPE_LABEL[stop.stopType]}</span>
                    </div>
                    <p className="text-xs text-slate-500 truncate">{stop.address}</p>
                    {stop.issueNote && <p className="text-xs text-red-600 mt-0.5">⚠️ {stop.issueNote}</p>}
                    {stop.order?.wasteType && <p className="text-xs text-slate-400">{stop.order.wasteType}{stop.order.volumeM3 ? ` · ${stop.order.volumeM3} м³` : ''}</p>}
                  </div>

                  {/* Priority toggle (only for pending stops) */}
                  {canDrag && (
                    <button
                      onClick={() => togglePriority(stop.id)}
                      title={stop.priority ? 'Премахни приоритет' : 'Маркирай като спешна'}
                      className={`flex-shrink-0 text-xs font-semibold px-2 py-1 rounded-lg border transition-colors ${
                        stop.priority
                          ? 'bg-red-100 text-red-700 border-red-200 hover:bg-red-200'
                          : 'bg-white text-slate-400 border-slate-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200'
                      }`}
                    >
                      🚨
                    </button>
                  )}

                  {/* Status + time */}
                  <div className="text-right flex-shrink-0">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STOP_STATUS_COLOR[stop.status] || 'bg-slate-100 text-slate-600'}`}>
                      {stop.status === 'COMPLETED' ? 'Завършена' : stop.status === 'ARRIVED' ? 'Пристигнал' : stop.status === 'ISSUE_REPORTED' ? 'Проблем' : 'Предстои'}
                    </span>
                    {stop.completedAt && (
                      <p className="text-xs text-slate-400 mt-0.5">
                        {new Date(stop.completedAt).toLocaleTimeString('bg-BG', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function CreateTripModal({ onClose, onCreated }) {
  const [step, setStep] = useState(1);
  const [confirmedOrders, setConfirmedOrders] = useState([]);
  const [trucks, setTrucks] = useState([]);
  const [disposalSites, setDisposalSites] = useState([]);
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [selectedTruck, setSelectedTruck] = useState('');
  const [selectedDisposal, setSelectedDisposal] = useState('');
  const [tripDate, setTripDate] = useState(new Date().toISOString().split('T')[0]);
  const [saving, setSaving] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/orders?status=CONFIRMED').catch(() => []),
      api.get('/trucks').catch(() => []),
      api.get('/disposal-sites').catch(() => []),
    ]).then(([orders, tr, sites]) => {
      setConfirmedOrders(Array.isArray(orders) ? orders : []);
      setTrucks(Array.isArray(tr) ? tr : []);
      setDisposalSites(Array.isArray(sites) ? sites : []);
      setLoadingData(false);
    });
  }, []);

  function toggleOrder(id) {
    setSelectedOrders(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  }

  async function save() {
    if (!selectedTruck || selectedOrders.length === 0) return;
    setSaving(true);
    try {
      await api.post('/trips', {
        truckId: selectedTruck,
        orderIds: selectedOrders,
        disposalSiteId: selectedDisposal || undefined,
        date: new Date(tripDate).toISOString(),
      });
      onCreated();
    } catch (e) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  }

  const selectedOrdersData = confirmedOrders.filter(o => selectedOrders.includes(o.id));
  const selectedTruckData  = trucks.find(t => t.id === selectedTruck);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <div>
            <h2 className="font-bold text-slate-800 text-lg">Нов курс</h2>
            <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
              <span className={step >= 1 ? 'text-green-600 font-medium' : ''}>1. Заявки</span>
              <span>›</span>
              <span className={step >= 2 ? 'text-green-600 font-medium' : ''}>2. Камион & Дата</span>
              <span>›</span>
              <span className={step >= 3 ? 'text-green-600 font-medium' : ''}>3. Потвърди</span>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loadingData ? (
            <div className="flex justify-center py-8"><RefreshCw className="w-6 h-6 text-green-600 animate-spin" /></div>
          ) : (
            <>
              {/* Step 1: Select orders */}
              {step === 1 && (
                <div className="space-y-3">
                  <p className="text-sm text-slate-500 mb-4">Изберете потвърдени заявки за включване в курса</p>
                  {confirmedOrders.length === 0 && (
                    <div className="text-center py-8 text-slate-400">
                      <Package className="w-10 h-10 mx-auto mb-2 opacity-40" />
                      <p className="text-sm">Няма потвърдени заявки</p>
                      <p className="text-xs mt-1">Потвърдете заявки от раздел "Заявки"</p>
                    </div>
                  )}
                  {confirmedOrders.map(order => {
                    const sel = selectedOrders.includes(order.id);
                    return (
                      <div key={order.id}
                        onClick={() => toggleOrder(order.id)}
                        className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${sel ? 'border-green-500 bg-green-50' : 'border-slate-200 hover:border-slate-300'}`}>
                        <div className={`w-5 h-5 rounded flex items-center justify-center border-2 flex-shrink-0 ${sel ? 'bg-green-500 border-green-500' : 'border-slate-300'}`}>
                          {sel && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-slate-800">{order.client?.name}</span>
                            <span className="text-xs">{order.orderType === 'CONTAINER' ? '📦' : '🚛'}</span>
                          </div>
                          <p className="text-xs text-slate-500 truncate">{order.address}</p>
                          <p className="text-xs text-slate-400">{order.wasteType}{order.volumeM3 ? ` · ${order.volumeM3} м³` : ''}{order.estimatedKg ? ` · ${order.estimatedKg} кг` : ''}</p>
                        </div>
                        <StatusBadge status={order.status} />
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Step 2: Select truck + date */}
              {step === 2 && (
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Камион и шофьор</label>
                    <div className="space-y-2">
                      {trucks.map(truck => (
                        <div key={truck.id} onClick={() => setSelectedTruck(truck.id)}
                          className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${selectedTruck === truck.id ? 'border-green-500 bg-green-50' : 'border-slate-200 hover:border-slate-300'}`}>
                          <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ background: truck.color || '#64748b' }} />
                          <div className="flex-1">
                            <p className="font-semibold text-slate-800 text-sm">{truck.plate} · {truck.model}</p>
                            <p className="text-xs text-slate-500">👤 {truck.driver?.name || 'Без шофьор'} · {truck.capacityM3} м³ / {truck.capacityKg} кг</p>
                          </div>
                          {truck.status !== 'AVAILABLE' && <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">Зает</span>}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Дата на курса</label>
                    <input type="date" value={tripDate} onChange={e => setTripDate(e.target.value)}
                      className="border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 w-full" />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Депо за разтоварване (незадължително)</label>
                    <select value={selectedDisposal} onChange={e => setSelectedDisposal(e.target.value)}
                      className="border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 w-full">
                      <option value="">— Изберете депо —</option>
                      {disposalSites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                </div>
              )}

              {/* Step 3: Confirm */}
              {step === 3 && (
                <div className="space-y-4">
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                    <p className="font-semibold text-green-800 mb-1">Преглед на курса</p>
                    <div className="text-sm text-green-700 space-y-1">
                      <p>🚛 {selectedTruckData?.plate} — {selectedTruckData?.driver?.name}</p>
                      <p>🗓️ {new Date(tripDate).toLocaleDateString('bg-BG', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                      <p>📍 {selectedOrders.length} спирки</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {selectedOrdersData.map((o, i) => (
                      <div key={o.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <div className="w-6 h-6 rounded-full bg-slate-300 text-slate-700 text-xs font-bold flex items-center justify-center flex-shrink-0">{i + 1}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800 truncate">{o.client?.name}</p>
                          <p className="text-xs text-slate-500 truncate">{o.address}</p>
                        </div>
                        <span className="text-sm">{o.orderType === 'CONTAINER' ? '📦' : '🚛'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <button onClick={() => step > 1 ? setStep(step - 1) : onClose()}
            className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors">
            {step > 1 ? '← Назад' : 'Откажи'}
          </button>
          {step < 3 ? (
            <button onClick={() => setStep(step + 1)}
              disabled={(step === 1 && selectedOrders.length === 0) || (step === 2 && !selectedTruck)}
              className="px-5 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white text-sm font-semibold rounded-lg transition-colors">
              Напред →
            </button>
          ) : (
            <button onClick={save} disabled={saving}
              className="px-5 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white text-sm font-semibold rounded-lg transition-colors">
              {saving ? 'Записване...' : '✅ Създай курса'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
