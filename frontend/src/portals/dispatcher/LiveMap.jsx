import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../lib/api';
import { RefreshCw, Layers, TrendingDown, Fuel, Clock, MapPin, ChevronDown, X, Edit2, ToggleLeft, ToggleRight, ChevronRight } from 'lucide-react';

const HQ = [43.861917, 26.034763];

const STOP_STATUS_COLOR = {
  COMPLETED:      '#10b981',
  ARRIVED:        '#f59e0b',
  PENDING:        '#94a3b8',
  ISSUE_REPORTED: '#ef4444',
};

const STOP_TYPE_ICON  = { DELIVERY: '📦', PICKUP: '🔄', LOAD: '🚛', UNLOAD: '🏗️' };
const STOP_TYPE_LABEL = { DELIVERY: 'Доставка', PICKUP: 'Вземане', LOAD: 'Товарене', UNLOAD: 'Разтоварване' };

const TRIP_STATUS_BG = {
  PLANNED:     'bg-slate-100 text-slate-700',
  IN_PROGRESS: 'bg-green-100 text-green-700',
  COMPLETED:   'bg-blue-100 text-blue-700',
};
const TRIP_STATUS_LABEL = { PLANNED: 'Планиран', IN_PROGRESS: 'В изпълнение', COMPLETED: 'Завършен' };

function makeIcon(html, size = 36) {
  return L.divIcon({ html, className: '', iconSize: [size, size], iconAnchor: [size / 2, size / 2] });
}

const HQ_ICON = makeIcon(
  `<div style="background:#1e293b;color:white;border-radius:10px;width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-size:18px;border:2.5px solid white;box-shadow:0 3px 10px rgba(0,0,0,0.4)">🏭</div>`
);

function stopIcon(stop, idx, isSelected) {
  const bg  = STOP_STATUS_COLOR[stop.status] || '#94a3b8';
  const size = isSelected ? 36 : 30;
  const label = stop.status === 'COMPLETED' ? '✓' : stop.status === 'ISSUE_REPORTED' ? '!' : (idx + 1);
  return makeIcon(
    `<div style="background:${bg};border-radius:50%;width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;border:2.5px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.35);color:white;font-weight:bold;font-size:${isSelected ? 14 : 12}px;">${label}</div>`,
    size
  );
}

function disposalIcon() {
  return makeIcon(`<div style="background:#7c3aed;border-radius:8px;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-size:15px;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.25)">🏗️</div>`, 32);
}

function truckIcon(color) {
  return makeIcon(`<div style="background:${color};border-radius:8px;width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-size:18px;border:2px solid white;box-shadow:0 3px 10px rgba(0,0,0,0.4)">🚛</div>`);
}

const WASTE_TYPE_OPTIONS = [
  { key: 'Строителни отпадъци', color: 'bg-amber-100 text-amber-800 border-amber-200' },
  { key: 'Метали',              color: 'bg-blue-100 text-blue-800 border-blue-200' },
  { key: 'Смесени отпадъци',   color: 'bg-slate-100 text-slate-700 border-slate-200' },
  { key: 'Опасни отпадъци',    color: 'bg-red-100 text-red-800 border-red-200' },
  { key: 'Зелени отпадъци',    color: 'bg-green-100 text-green-800 border-green-200' },
  { key: 'Хартия и картон',    color: 'bg-orange-100 text-orange-800 border-orange-200' },
];

function wasteColor(type) {
  return WASTE_TYPE_OPTIONS.find(o => o.key === type)?.color ?? 'bg-slate-100 text-slate-600 border-slate-200';
}

function MapFitter({ bounds }) {
  const map = useMap();
  useEffect(() => {
    if (bounds?.length > 1) {
      try { map.fitBounds(bounds, { padding: [40, 40] }); } catch {}
    }
  }, [bounds]);
  return null;
}

function FlyToController({ target }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo(target, 15, { duration: 1.2 });
  }, [target]);
  return null;
}

function LiveTruckMarker({ position, color, label }) {
  const map = useMap();
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current) {
      ref.current = L.marker([position.lat, position.lng], { icon: truckIcon(color), zIndexOffset: 1000 }).addTo(map);
      ref.current.bindPopup(`<b>🚛 ${label}</b><br/><small class="text-green-600">● GPS live</small>`);
    } else {
      ref.current.setLatLng([position.lat, position.lng]);
    }
  }, [position.lat, position.lng]);
  useEffect(() => () => { ref.current?.remove(); ref.current = null; }, []);
  return null;
}

function SiteEditPanel({ site, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: site.name || '',
    address: site.address || '',
    lat: site.lat ?? '',
    lng: site.lng ?? '',
    radiusM: site.radiusM ?? 300,
    wasteTypes: site.wasteTypes || [],
    active: site.active !== false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }
  function toggleWaste(type) {
    setForm(f => ({ ...f, wasteTypes: f.wasteTypes.includes(type) ? f.wasteTypes.filter(t => t !== type) : [...f.wasteTypes, type] }));
  }

  async function save() {
    setSaving(true); setError('');
    try {
      await api.patch(`/disposal-sites/${site.id}`, {
        ...form, lat: parseFloat(form.lat), lng: parseFloat(form.lng), radiusM: parseInt(form.radiusM)
      });
      onSaved();
      onClose();
    } catch (e) { setError(e.message || 'Грешка при запис'); setSaving(false); }
  }

  const INPUT = 'w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500';

  return (
    <div className="absolute top-4 right-4 z-[1000] bg-white border border-slate-200 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
      style={{ width: 300, maxHeight: 'calc(100vh - 120px)' }}>
      {/* Header */}
      <div className="px-4 py-3 bg-purple-700 flex items-center gap-2 flex-shrink-0">
        <span className="text-lg">🏗️</span>
        <span className="font-bold text-white text-sm flex-1 truncate">Редактирай депо</span>
        <button onClick={onClose} className="text-purple-300 hover:text-white transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>
      {/* Form */}
      <div className="overflow-y-auto flex-1 p-4 space-y-3">
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Наименование</label>
          <input className={INPUT} value={form.name} onChange={e => set('name', e.target.value)} placeholder="Депо Север" />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Адрес</label>
          <input className={INPUT} value={form.address} onChange={e => set('address', e.target.value)} placeholder="ул. Промишлена 1, Русе" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Ширина (lat)</label>
            <input className={INPUT} type="number" step="any" value={form.lat} onChange={e => set('lat', e.target.value)} />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Дължина (lng)</label>
            <input className={INPUT} type="number" step="any" value={form.lng} onChange={e => set('lng', e.target.value)} />
          </div>
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Зона (метри)</label>
          <input className={INPUT} type="number" min="50" max="5000" value={form.radiusM} onChange={e => set('radiusM', e.target.value)} />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Видове отпадъци</label>
          <div className="flex flex-wrap gap-1.5">
            {WASTE_TYPE_OPTIONS.map(({ key, color }) => {
              const sel = form.wasteTypes.includes(key);
              return (
                <button key={key} type="button" onClick={() => toggleWaste(key)}
                  className={`px-2 py-0.5 rounded-full text-[10px] font-medium border transition-all ${sel ? color + ' ring-1 ring-purple-400 ring-offset-1' : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-50'}`}>
                  {key}
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => set('active', !form.active)}
            className={form.active ? 'text-green-600' : 'text-slate-400'}>
            {form.active ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
          </button>
          <span className="text-xs text-slate-500">{form.active ? 'Активно' : 'Неактивно'}</span>
        </div>
        {error && <p className="text-red-500 text-xs">{error}</p>}
      </div>
      {/* Footer */}
      <div className="px-4 py-3 border-t border-slate-100 flex gap-2 flex-shrink-0">
        <button onClick={onClose} className="flex-1 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-50">Отказ</button>
        <button onClick={save} disabled={saving}
          className="flex-1 py-1.5 rounded-lg bg-purple-600 text-white text-xs font-semibold hover:bg-purple-700 disabled:opacity-50">
          {saving ? 'Запазване...' : 'Запази'}
        </button>
      </div>
    </div>
  );
}

export default function LiveMap() {
  const [searchParams] = useSearchParams();
  const preselectedTripId = searchParams.get('trip');

  const [trips, setTrips]           = useState([]);
  const [disposalSites, setDisposal] = useState([]);
  const [selectedTripId, setSelectedTripId] = useState(preselectedTripId || null);
  const [routeData, setRouteData]   = useState(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [dateFilter, setDateFilter] = useState('today');
  const [showDisposal, setShowDisposal] = useState(true);
  const [livePos, setLivePos]       = useState({});
  const [loading, setLoading]       = useState(true);
  const [editingSite, setEditingSite] = useState(null);
  const [flyToTarget, setFlyToTarget] = useState(null);

  const loadTrips = useCallback(async () => {
    setLoading(true);
    try {
      const [allTrips, sites] = await Promise.all([
        api.get('/trips'),
        api.get('/disposal-sites').catch(() => MOCK_DISPOSAL),
      ]);
      setTrips(allTrips || []);
      setDisposal(sites || MOCK_DISPOSAL);
    } catch { setDisposal(MOCK_DISPOSAL); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    loadTrips();
    // Listen for live GPS (future real GPS devices)
    // socket.on('truck_position', ...) — kept for real device integration
    return () => {};
  }, [loadTrips]);

  // Load route+savings when a trip is selected
  useEffect(() => {
    if (!selectedTripId) { setRouteData(null); return; }
    setRouteLoading(true);
    api.get(`/trips/${selectedTripId}/route`)
      .then(data => setRouteData(data))
      .catch(() => setRouteData(null))
      .finally(() => setRouteLoading(false));
  }, [selectedTripId]);

  function selectTrip(id) {
    setSelectedTripId(prev => prev === id ? null : id);
  }

  // Filter trips by date
  const today = new Date().toDateString();
  const filteredTrips = trips.filter(t => {
    const d = new Date(t.date).toDateString();
    if (dateFilter === 'today')  return d === today || t.status === 'IN_PROGRESS';
    if (dateFilter === 'week') {
      const diff = (Date.now() - new Date(t.date).getTime()) / 86400000;
      return diff <= 7 && diff >= -1;
    }
    return true;
  });

  const selectedTrip = trips.find(t => t.id === selectedTripId);
  const customerStops = selectedTrip?.stops?.filter(s => s.stopType !== 'UNLOAD') || [];

  // Bounds for map fitting when trip selected
  const selectedBounds = routeData?.geometry?.length > 0
    ? routeData.geometry
    : customerStops.length > 0
      ? [HQ, ...customerStops.map(s => [s.lat, s.lng]), HQ]
      : null;

  return (
    <div className="flex h-full overflow-hidden">
      {/* MAP */}
      <div className="flex-1 relative">
        {(loading || routeLoading) && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-white border border-slate-200 rounded-xl shadow px-4 py-2 flex items-center gap-2 text-sm text-slate-600">
            <RefreshCw className="w-4 h-4 animate-spin text-green-600" />
            {routeLoading ? 'Изчисляване на маршрут...' : 'Зареждане...'}
          </div>
        )}

        <MapContainer center={HQ} zoom={11} style={{ height: '100%', width: '100%' }} zoomControl={false}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='© <a href="https://openstreetmap.org">OpenStreetMap</a>'
          />
          {selectedBounds && <MapFitter bounds={selectedBounds} />}
          {flyToTarget && <FlyToController target={flyToTarget} />}

          {/* HQ marker */}
          <Marker position={HQ} icon={HQ_ICON}>
            <Popup><b>🏭 База Logix</b><br />ул. Борисова, Русе<br /><small>Начална и крайна точка на всички курсове</small></Popup>
          </Marker>

          {/* Disposal sites */}
          {showDisposal && disposalSites.map(site => (
            <React.Fragment key={site.id}>
              <Marker position={[site.lat, site.lng]} icon={disposalIcon()}>
                <Popup minWidth={200}>
                  <div style={{ fontFamily: 'inherit' }}>
                    <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>🏗️ {site.name}</div>
                    <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6 }}>{site.address}</div>
                    {site.wasteTypes?.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginBottom: 6 }}>
                        {site.wasteTypes.map(t => (
                          <span key={t} style={{ fontSize: 10, background: '#f3e8ff', color: '#7c3aed', padding: '1px 6px', borderRadius: 99, fontWeight: 600 }}>{t}</span>
                        ))}
                      </div>
                    )}
                    <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 8 }}>Зона: {site.radiusM || 300} м</div>
                    <button
                      onClick={() => { setEditingSite(site); setFlyToTarget(null); }}
                      style={{ width: '100%', background: '#7c3aed', color: 'white', border: 'none', borderRadius: 8, padding: '5px 0', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                      ✏️ Редактирай
                    </button>
                  </div>
                </Popup>
              </Marker>
              <Circle center={[site.lat, site.lng]} radius={site.radiusM || 300}
                pathOptions={{ color: '#7c3aed', fillColor: '#7c3aed', fillOpacity: 0.07, weight: 1.5, dashArray: '6 4' }} />
            </React.Fragment>
          ))}

          {/* Non-selected trips: show faint polylines from DB geometry */}
          {filteredTrips.filter(t => t.id !== selectedTripId).map(trip => {
            const stops = trip.stops.filter(s => s.stopType !== 'UNLOAD');
            if (stops.length === 0) return null;
            const pts = [HQ, ...stops.map(s => [s.lat, s.lng]), HQ];
            return (
              <Polyline key={trip.id} positions={pts}
                pathOptions={{ color: trip.truck?.color || '#94a3b8', weight: 2, opacity: 0.25, dashArray: '4 4' }}
                eventHandlers={{ click: () => selectTrip(trip.id) }}
              />
            );
          })}

          {/* Selected trip — OSRM route + stop markers */}
          {selectedTrip && routeData?.geometry && (
            <>
              {/* Manual route glow (wide blurred halo) — shown when worse than VRP */}
              {routeData.isManuallyReordered && routeData.manualVsVrpKm > 0 && (
                <Polyline positions={routeData.geometry}
                  pathOptions={{ color: '#f97316', weight: 18, opacity: 0.18, lineCap: 'round', lineJoin: 'round' }} />
              )}

              {/* Full OSRM route — solid */}
              <Polyline positions={routeData.geometry}
                pathOptions={{
                  color: routeData.isManuallyReordered && routeData.manualVsVrpKm > 0
                    ? '#f97316'
                    : (selectedTrip.truck?.color || '#3b82f6'),
                  weight: 5,
                  opacity: 0.9
                }} />

              {/* VRP optimal route overlay — dashed green with glow, shown when manually reordered */}
              {routeData.isManuallyReordered && routeData.vrpGeometry?.length > 0 && (
                <>
                  {/* Glow layer */}
                  <Polyline positions={routeData.vrpGeometry}
                    pathOptions={{ color: '#10b981', weight: 14, opacity: 0.2, lineCap: 'round', lineJoin: 'round' }} />
                  {/* Dashed line */}
                  <Polyline positions={routeData.vrpGeometry}
                    pathOptions={{ color: '#10b981', weight: 3.5, opacity: 1, dashArray: '10 7', lineCap: 'round' }} />
                </>
              )}

              {/* Return-to-base dashed overlay: last customer stop → HQ */}
              {customerStops.length > 0 && (() => {
                const last = customerStops[customerStops.length - 1];
                const returnVia = selectedTrip.disposalSite
                  ? [[last.lat, last.lng], [selectedTrip.disposalSite.lat, selectedTrip.disposalSite.lng], HQ]
                  : [[last.lat, last.lng], HQ];
                return (
                  <Polyline positions={returnVia}
                    pathOptions={{ color: '#94a3b8', weight: 3, opacity: 0.85, dashArray: '9 7' }} />
                );
              })()}

              {/* Stop markers */}
              {customerStops.map((stop, idx) => (
                <Marker key={stop.id} position={[stop.lat, stop.lng]} icon={stopIcon(stop, idx, true)}>
                  <Popup>
                    <div style={{ minWidth: 180 }}>
                      <div className="font-bold text-sm mb-1">
                        {STOP_TYPE_ICON[stop.stopType]} {stop.address}
                      </div>
                      <div className="text-xs text-slate-600 mb-1">{stop.order?.client?.name}</div>
                      <div className="text-xs font-semibold" style={{ color: STOP_STATUS_COLOR[stop.status] }}>
                        ● {stop.status === 'COMPLETED' ? 'Завършена' : stop.status === 'ARRIVED' ? 'Пристигнал' : stop.status === 'ISSUE_REPORTED' ? 'Проблем' : 'Предстои'}
                      </div>
                      <div className="text-xs text-slate-400 mt-1">Спирка {idx + 1} от {customerStops.length}</div>
                      <div className="text-xs text-slate-500">{STOP_TYPE_LABEL[stop.stopType]}</div>
                      {stop.order?.wasteType && <div className="text-xs text-slate-400 mt-0.5">♻️ {stop.order.wasteType}</div>}
                    </div>
                  </Popup>
                </Marker>
              ))}
            </>
          )}

          {/* Live truck positions */}
          {Object.entries(livePos).map(([truckId, pos]) => (
            <LiveTruckMarker key={truckId} position={pos} color={pos.color || '#3b82f6'} label={pos.plate || truckId} />
          ))}
        </MapContainer>

        {/* Site edit panel */}
        {editingSite && (
          <SiteEditPanel
            site={editingSite}
            onClose={() => setEditingSite(null)}
            onSaved={() => { setEditingSite(null); loadTrips(); }}
          />
        )}

        {/* Map overlay controls */}
        <div className={`absolute top-4 z-[999] flex flex-col gap-2 ${editingSite ? 'right-80' : 'right-4'}`}>
          <button onClick={loadTrips} className="bg-white border border-slate-200 rounded-xl shadow p-2.5 hover:bg-slate-50 transition-colors" title="Обнови">
            <RefreshCw className="w-4 h-4 text-slate-600" />
          </button>
          <div className="bg-white border border-slate-200 rounded-xl shadow p-3 text-xs space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={showDisposal} onChange={e => setShowDisposal(e.target.checked)} className="accent-purple-600" />
              <span className="font-medium text-slate-700">🏗️ Депа</span>
            </label>
          </div>
        </div>

        {/* Legend */}
        <div className="absolute bottom-6 left-4 z-[999] bg-white/95 backdrop-blur border border-slate-200 rounded-xl shadow p-3 text-xs space-y-1.5">
          <p className="font-bold text-slate-600 uppercase tracking-wide text-[10px] mb-2">Статус спирки</p>
          {[['#10b981','Завършена'], ['#f59e0b','Пристигнал'], ['#94a3b8','Предстои'], ['#ef4444','Проблем']].map(([c,l]) => (
            <div key={l} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ background: c }} />
              <span className="text-slate-500">{l}</span>
            </div>
          ))}
          {routeData?.isManuallyReordered && (
            <div className="pt-1.5 border-t border-slate-100 mt-1 space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-5 h-0.5 rounded-full" style={{ background: '#10b981', borderTop: '2px dashed #10b981' }} />
                <span className="text-[10px] text-slate-500">VRP оптимален</span>
              </div>
            </div>
          )}
          <div className="pt-1 border-t border-slate-100 mt-1 text-[10px] text-slate-400">
            Кликни на курс за детайли
          </div>
        </div>

        {/* Step-by-step route panel */}
        {selectedTrip && routeData && (
          <div className="absolute top-4 left-4 z-[999] bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden flex flex-col"
            style={{ width: 300, maxHeight: 'calc(100vh - 120px)' }}>

            {/* Header */}
            <div className="px-4 py-3 bg-slate-800 flex items-center gap-2 flex-shrink-0">
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: selectedTrip.truck?.color || '#64748b' }} />
              <span className="font-bold text-white text-sm">{selectedTrip.truck?.plate}</span>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${TRIP_STATUS_BG[selectedTrip.status]}`}>
                {TRIP_STATUS_LABEL[selectedTrip.status]}
              </span>
              <button onClick={() => setSelectedTripId(null)} className="ml-auto text-slate-400 hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Route meta */}
            <div className="px-4 py-2 bg-slate-700 text-slate-300 flex items-center gap-3 text-[10px] flex-shrink-0">
              <span>📏 {routeData.currentKm ?? routeData.optimizedKm} км</span>
              <span>⏱️ ~{Math.round(routeData.durationMin / 60)}ч {routeData.durationMin % 60}мин</span>
              <span className="flex-1 truncate">👤 {selectedTrip.truck?.driver?.name}</span>
              {routeData.isManuallyReordered
                ? <span className="flex-shrink-0 bg-orange-500 text-white font-bold px-1.5 py-0.5 rounded-full text-[9px]">⚠ Ръчен ред</span>
                : <span className="flex-shrink-0 bg-emerald-500 text-white font-bold px-1.5 py-0.5 rounded-full text-[9px]">✓ VRP оптимален</span>
              }
            </div>

            {/* Manual vs VRP comparison strip — shown inline when worse than optimal */}
            {routeData.isManuallyReordered && routeData.manualVsVrpKm > 0 && (
              <div className="bg-orange-50 border-b border-orange-200 px-4 py-2.5 flex-shrink-0">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-bold text-orange-800">Сравнение с VRP оптималния</span>
                </div>
                <div className="grid grid-cols-3 gap-1.5 text-center">
                  <div className="bg-orange-100 rounded-lg py-1.5">
                    <div className="text-xs font-black text-slate-700">{routeData.currentKm} км</div>
                    <div className="text-[9px] text-slate-500">ваш ред</div>
                  </div>
                  <div className="bg-emerald-50 rounded-lg py-1.5 border border-emerald-200">
                    <div className="text-xs font-black text-emerald-700">{routeData.vrpKm} км</div>
                    <div className="text-[9px] text-emerald-600">VRP оптим.</div>
                  </div>
                  <div className="bg-red-50 rounded-lg py-1.5 border border-red-200">
                    <div className="text-xs font-black text-red-600">+{routeData.manualVsVrpKm} км</div>
                    <div className="text-[9px] text-red-500">+€{routeData.manualVsVrpEur}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Step-by-step route list */}
            <div className="overflow-y-auto flex-1">
              {/* HQ start */}
              <div className="flex items-center gap-3 px-4 py-2.5">
                <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-sm flex-shrink-0">🏭</div>
                <div>
                  <p className="text-xs font-bold text-slate-700">База Logix</p>
                  <p className="text-[10px] text-slate-400">Начало на курса · ул. Борисова, Русе</p>
                </div>
              </div>

              {customerStops.map((stop, idx) => (
                <React.Fragment key={stop.id}>
                  {/* Connector line */}
                  <div className="flex items-center gap-3 px-4">
                    <div className="w-7 flex justify-center flex-shrink-0">
                      <div className="w-px h-3 bg-slate-200" />
                    </div>
                    <div className="text-[9px] text-slate-300 ml-0.5" />
                  </div>

                  {/* Stop row */}
                  <div className={`flex items-start gap-3 px-4 py-2.5 ${
                    stop.status === 'ISSUE_REPORTED' ? 'bg-red-50' :
                    stop.status === 'COMPLETED' ? 'bg-green-50' :
                    stop.status === 'ARRIVED' ? 'bg-amber-50' : ''
                  }`}>
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-black flex-shrink-0"
                      style={{ background: STOP_STATUS_COLOR[stop.status] || '#94a3b8' }}>
                      {stop.status === 'COMPLETED' ? '✓' : stop.status === 'ISSUE_REPORTED' ? '!' : idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1 flex-wrap">
                        <span className="text-xs">{STOP_TYPE_ICON[stop.stopType]}</span>
                        <span className="text-xs font-semibold text-slate-800 truncate">{stop.order?.client?.name || stop.address.split(',')[0]}</span>
                      </div>
                      <p className="text-[10px] text-slate-500 truncate">{stop.address}</p>
                      {stop.order?.wasteType && (
                        <p className="text-[10px] text-slate-400">
                          {stop.order.wasteType}{stop.order.volumeM3 ? ` · ${stop.order.volumeM3}м³` : ''}
                        </p>
                      )}
                      <span className={`inline-block text-[10px] font-medium px-1.5 py-0.5 rounded-full mt-0.5 ${
                        stop.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                        stop.status === 'ARRIVED' ? 'bg-amber-100 text-amber-700' :
                        stop.status === 'ISSUE_REPORTED' ? 'bg-red-100 text-red-700' :
                        'bg-slate-100 text-slate-500'
                      }`}>
                        {stop.status === 'COMPLETED' ? '✓ Завършена' :
                         stop.status === 'ARRIVED' ? '● Пристигнал' :
                         stop.status === 'ISSUE_REPORTED' ? '⚠ Проблем' : '◌ Предстои'}
                      </span>
                    </div>
                  </div>
                </React.Fragment>
              ))}

              {/* Disposal site if present */}
              {selectedTrip.disposalSite && (
                <>
                  <div className="flex items-center gap-3 px-4">
                    <div className="w-7 flex justify-center flex-shrink-0">
                      <div className="w-px h-3 bg-purple-200" style={{ borderLeft: '2px dashed #c4b5fd' }} />
                    </div>
                  </div>
                  <div className="flex items-center gap-3 px-4 py-2.5 bg-purple-50">
                    <div className="w-7 h-7 rounded-lg bg-purple-700 flex items-center justify-center text-sm flex-shrink-0">🏗️</div>
                    <div>
                      <p className="text-xs font-bold text-purple-800">{selectedTrip.disposalSite.name}</p>
                      <p className="text-[10px] text-purple-500">Разтоварване на депото</p>
                    </div>
                  </div>
                </>
              )}

              {/* Return to HQ */}
              <div className="flex items-center gap-3 px-4">
                <div className="w-7 flex justify-center flex-shrink-0">
                  <div className="w-px h-3 bg-slate-200" />
                </div>
              </div>
              <div className="flex items-center gap-3 px-4 py-2.5 border-t border-slate-100 bg-slate-50">
                <div className="w-7 h-7 rounded-lg bg-slate-600 flex items-center justify-center text-sm flex-shrink-0">🏭</div>
                <div>
                  <p className="text-xs font-bold text-slate-600">База (завръщане)</p>
                  <p className="text-[10px] text-slate-400">Край на курса</p>
                </div>
              </div>
            </div>

            {/* Savings footer */}
            {(() => {
              const eur = routeData.fuelSavedEur ?? (routeData.fuelSavedL ? +(routeData.fuelSavedL * 1.70).toFixed(2) : null);
              const hasSavings = !routeData.isSingleStop && routeData.savingPercent > 0;

              // Manual reorder vs VRP comparison
              if (routeData.isManuallyReordered) {
                const worse = routeData.manualVsVrpKm > 0;
                return worse ? (
                  <div className="border-t border-amber-200 px-4 py-3 bg-amber-50 flex-shrink-0">
                    <p className="text-[9px] font-bold text-amber-700 uppercase tracking-wide mb-2">⚠️ Ръчен ред vs VRP оптимален</p>
                    <div className="grid grid-cols-2 gap-1.5 text-center mb-2">
                      <div className="bg-white rounded-lg py-1.5 px-1 border border-slate-100">
                        <div className="text-sm font-black text-slate-700">{routeData.currentKm} км</div>
                        <div className="text-[9px] text-slate-500">ваш ред</div>
                      </div>
                      <div className="bg-emerald-50 rounded-lg py-1.5 px-1 border border-emerald-100">
                        <div className="text-sm font-black text-emerald-600">{routeData.vrpKm} км</div>
                        <div className="text-[9px] text-emerald-600">VRP оптим.</div>
                      </div>
                    </div>
                    <div className="bg-red-50 border border-red-100 rounded-lg py-2 px-3 flex items-center justify-between">
                      <div>
                        <div className="text-xs font-black text-red-600">+{routeData.manualVsVrpKm} км излишни</div>
                        <div className="text-[9px] text-red-500">≈ +{routeData.manualVsVrpFuelL} л гориво</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-black text-red-600">+€{routeData.manualVsVrpEur}</div>
                        <div className="text-[9px] text-red-400">допълн. разход</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="border-t border-emerald-200 px-4 py-3 bg-emerald-50 flex-shrink-0 text-center">
                    <p className="text-[9px] font-bold text-emerald-700 uppercase tracking-wide mb-1">✅ Ръчен ред — оптимален</p>
                    <p className="text-[9px] text-emerald-600">{routeData.currentKm} км ваш · {routeData.vrpKm} км VRP · Добра работа!</p>
                  </div>
                );
              }

              if (routeData.isSingleStop) return (
                <div className="border-t border-slate-200 px-4 py-3 bg-slate-50 text-center flex-shrink-0">
                  <p className="text-xs font-semibold text-slate-600">Директна спирка</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{routeData.optimizedKm} км · оптимален маршрут</p>
                </div>
              );
              if (!hasSavings) return (
                <div className="border-t border-slate-200 px-4 py-3 bg-slate-50 text-center flex-shrink-0">
                  <p className="text-xs font-semibold text-slate-600">Маршрутът е оптимален</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{routeData.optimizedKm} км · {routeData.stopCount} спирки</p>
                </div>
              );
              return (
                <div className="border-t border-emerald-200 px-4 py-3 bg-emerald-50 flex-shrink-0">
                  <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-wide mb-2">VRP оптимизация vs зигзаг</p>
                  <div className="grid grid-cols-4 gap-1 text-center">
                    <div>
                      <div className="text-sm font-black text-emerald-600">{routeData.savingPercent}%</div>
                      <div className="text-[9px] text-emerald-700">спест.</div>
                    </div>
                    <div>
                      <div className="text-sm font-black text-slate-700">{routeData.savedKm} км</div>
                      <div className="text-[9px] text-slate-500">по-малко</div>
                    </div>
                    <div>
                      <div className="text-sm font-black text-blue-600">{routeData.fuelSavedL} л</div>
                      <div className="text-[9px] text-blue-600">гориво</div>
                    </div>
                    <div>
                      {eur != null && eur > 0
                        ? <><div className="text-sm font-black text-purple-600">€{eur}</div>
                           <div className="text-[9px] text-purple-600">спест.</div></>
                        : <><div className="text-sm font-black text-slate-400">—</div>
                           <div className="text-[9px] text-slate-400">€</div></>
                      }
                    </div>
                  </div>
                  <p className="text-[9px] text-emerald-500 mt-1.5 text-center">
                    {routeData.optimizedKm} км оптимален · {routeData.naiveKm} км зигзаг
                  </p>
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* SIDE PANEL */}
      <div className="w-72 bg-white border-l border-slate-200 overflow-y-auto flex-shrink-0 flex flex-col">
        {/* Date filter */}
        <div className="p-4 border-b border-slate-100 flex-shrink-0">
          <h2 className="font-bold text-slate-800 mb-3">Маршрути</h2>
          <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
            {[['today','Днес'],['week','Седмица'],['all','Всички']].map(([k,l]) => (
              <button key={k} onClick={() => setDateFilter(k)}
                className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-all ${dateFilter === k ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                {l}
              </button>
            ))}
          </div>
        </div>

        {/* Trip list */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {filteredTrips.length === 0 && (
            <div className="text-center py-8 text-slate-400">
              <div className="text-3xl mb-2">🗺️</div>
              <p className="text-sm">Няма курсове</p>
            </div>
          )}
          {filteredTrips.map(trip => {
            const done  = trip.stops.filter(s => s.status === 'COMPLETED').length;
            const isSel = trip.id === selectedTripId;
            const color = trip.truck?.color || '#64748b';
            const pct   = trip.stops.length > 0 ? Math.round(done / trip.stops.length * 100) : 0;

            return (
              <div key={trip.id}
                onClick={() => selectTrip(trip.id)}
                className={`rounded-xl border-2 cursor-pointer transition-all ${isSel ? '' : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'}`}
                style={isSel ? { borderColor: color, boxShadow: `0 0 0 3px ${color}22` } : {}}>
                <div className="p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: color }} />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-slate-800 truncate">{trip.truck?.plate}</p>
                      <p className="text-xs text-slate-500 truncate">👤 {trip.truck?.driver?.name}</p>
                    </div>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${TRIP_STATUS_BG[trip.status] || 'bg-slate-100 text-slate-600'}`}>
                      {TRIP_STATUS_LABEL[trip.status]}
                    </span>
                  </div>

                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mb-1">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>{done}/{trip.stops.length} спирки</span>
                    <span>{new Date(trip.date).toLocaleDateString('bg-BG', { day: 'numeric', month: 'short' })}</span>
                  </div>

                  {isSel && routeData && (
                    <div className="mt-2 pt-2 border-t border-slate-100 grid grid-cols-3 gap-1 text-center">
                      <div>
                        <div className="text-sm font-bold text-green-600">{routeData.savingPercent}%</div>
                        <div className="text-[9px] text-slate-400">спестено</div>
                      </div>
                      <div>
                        <div className="text-sm font-bold text-slate-700">{routeData.optimizedKm} км</div>
                        <div className="text-[9px] text-slate-400">маршрут</div>
                      </div>
                      <div>
                        {(routeData.fuelSavedEur != null && routeData.fuelSavedEur > 0)
                          ? <><div className="text-sm font-bold text-amber-600">€{routeData.fuelSavedEur}</div>
                             <div className="text-[9px] text-slate-400">спест.</div></>
                          : <><div className="text-sm font-bold text-slate-400">{routeData.fuelSavedL}л</div>
                             <div className="text-[9px] text-slate-400">гориво</div></>
                        }
                      </div>
                    </div>
                  )}
                </div>

                {/* Stop list when selected */}
                {isSel && selectedTrip && (
                  <div className="border-t border-slate-100 divide-y divide-slate-50">
                    {selectedTrip.stops.map((stop, i) => (
                      <div key={stop.id} className="flex items-center gap-2 px-3 py-2 text-xs">
                        <div className="w-5 h-5 rounded-full flex items-center justify-center text-white font-bold text-[10px] flex-shrink-0"
                          style={{ background: STOP_STATUS_COLOR[stop.status] || '#94a3b8' }}>
                          {stop.status === 'COMPLETED' ? '✓' : i + 1}
                        </div>
                        <span className="flex-shrink-0">{STOP_TYPE_ICON[stop.stopType]}</span>
                        <span className="text-slate-600 truncate flex-1">{stop.address}</span>
                      </div>
                    ))}
                    <div className="flex items-center gap-2 px-3 py-2 text-xs bg-slate-50">
                      <div className="w-5 h-5 rounded-lg bg-slate-700 flex items-center justify-center text-white text-[10px] flex-shrink-0">🏭</div>
                      <span className="text-slate-500">Завръщане в база</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Disposal sites */}
        <div className="border-t border-slate-100 flex-shrink-0">
          <div className="px-3 pt-3 pb-1 flex items-center justify-between">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Депа ({disposalSites.length})</p>
          </div>
          <div className="px-3 pb-3 space-y-1.5 max-h-52 overflow-y-auto">
            {disposalSites.map(site => (
              <div key={site.id}
                className={`flex items-center gap-2 p-2 rounded-lg border transition-all cursor-pointer hover:shadow-sm group ${
                  site.active !== false ? 'bg-purple-50 border-purple-100 hover:border-purple-300' : 'bg-slate-50 border-slate-100 opacity-60'
                }`}
                onClick={() => {
                  setFlyToTarget([site.lat, site.lng]);
                  setEditingSite(null);
                }}
              >
                <span className="text-sm flex-shrink-0">🏗️</span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-purple-800 truncate">{site.name}</p>
                  <p className="text-[10px] text-purple-400 truncate">{site.address}</p>
                  {site.wasteTypes?.length > 0 && (
                    <p className="text-[9px] text-purple-400 mt-0.5 truncate">{site.wasteTypes.slice(0, 2).join(' · ')}{site.wasteTypes.length > 2 ? ` +${site.wasteTypes.length - 2}` : ''}</p>
                  )}
                </div>
                <button
                  onClick={e => { e.stopPropagation(); setFlyToTarget([site.lat, site.lng]); setEditingSite(site); }}
                  className="flex-shrink-0 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity bg-white border border-purple-200 text-purple-600 hover:bg-purple-100"
                  title="Редактирай">
                  <Edit2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const MOCK_DISPOSAL = [
  { id: '1', name: 'РДНО "Липник"', address: 'с. Липник, Русе', lat: 43.8045, lng: 26.0512, radiusM: 350, wasteTypes: [] },
  { id: '2', name: 'Депо Бяла',     address: 'гр. Бяла',        lat: 43.4676, lng: 25.7312, radiusM: 300, wasteTypes: [] },
];
