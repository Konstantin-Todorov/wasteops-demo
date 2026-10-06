import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Crosshair, Layers, Loader2, Maximize2, Mountain, Navigation, Radio,
  Route as RouteIcon, Truck, Waypoints, X,
} from 'lucide-react';
import { api } from '../../lib/api';
import { socket, connectSocket } from '../../lib/socket';
import FleetMap from '../../components/map/FleetMap';
import { Badge, Button, EmptyState, IconButton, cx } from '../../components/ui';
import { TripTone } from '../../lib/icons';

const TRIP_LABEL = {
  PLANNED: 'Планиран', IN_PROGRESS: 'В движение', AT_DISPOSAL: 'На депо',
  PENDING_VERIFICATION: 'За проверка', COMPLETED: 'Завършен', CANCELLED: 'Отменен',
};

/** Следи дали приложението е в тъмна тема, за да смени и стила на картата. */
function useDarkTheme() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));
  useEffect(() => {
    const ob = new MutationObserver(() =>
      setDark(document.documentElement.classList.contains('dark')));
    ob.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => ob.disconnect();
  }, []);
  return dark;
}

export default function FleetView() {
  const [params] = useSearchParams();
  const mapRef = useRef(null);
  const dark = useDarkTheme();

  const [trips, setTrips] = useState([]);
  const [sites, setSites] = useState([]);
  const [livePos, setLivePos] = useState({});
  const [selectedId, setSelectedId] = useState(params.get('trip') || null);
  const [routeData, setRouteData] = useState(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [trails, setTrails] = useState(true);
  const [pitched, setPitched] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);

  /* ── данни ────────────────────────────────────────────────────────────── */
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [t, s] = await Promise.all([
          api.get('/trips').catch(() => []),
          api.get('/disposal-sites').catch(() => []),
        ]);
        if (!alive) return;
        setTrips(t || []); setSites(s || []);
      } finally { if (alive) setLoading(false); }
    })();

    connectSocket();
    const onPos = (d) => setLivePos(prev => ({ ...prev, [d.truckId]: d }));
    socket.on('truck_position', onPos);
    return () => { alive = false; socket.off('truck_position', onPos); };
  }, []);

  useEffect(() => {
    if (!selectedId) { setRouteData(null); return; }
    setRouteLoading(true);
    api.get(`/trips/${selectedId}/route`)
      .then(setRouteData).catch(() => setRouteData(null))
      .finally(() => setRouteLoading(false));
  }, [selectedId]);

  /* ── производни данни за картата ──────────────────────────────────────── */
  const activeTrips = useMemo(
    () => trips.filter(t => ['PLANNED', 'IN_PROGRESS', 'AT_DISPOSAL'].includes(t.status)),
    [trips]);

  const selected = useMemo(
    () => trips.find(t => t.id === selectedId) || null, [trips, selectedId]);

  const mapRoutes = useMemo(() => {
    if (routeData?.geometry?.length) {
      return [{ id: selectedId, color: selected?.truck?.color || '#6366f1', geometry: routeData.geometry }];
    }
    return [];
  }, [routeData, selectedId, selected]);

  const mapStops = useMemo(() => {
    const src = selected ? [selected] : activeTrips;
    return src.flatMap(t => (t.stops || []).map(s => ({
      id: s.id, lat: s.lat, lng: s.lng, sequence: s.sequence, status: s.status,
      label: s.order?.client?.name || s.address, address: s.address, tripId: t.id,
    })));
  }, [selected, activeTrips]);

  const onStopClick = useCallback((s) => {
    mapRef.current?.flyTo(s.lat, s.lng, 16);
  }, []);

  // При избор на курс показваме ЦЕЛИЯ маршрут. Предпочитаме реалната
  // геометрия по пътищата; ако още не е заредена, ползваме спирките.
  useEffect(() => {
    if (!selected) return;
    const fromGeometry = (routeData?.geometry || []).map(([lat, lng]) => [lng, lat]);
    const fromStops = (selected.stops || [])
      .filter(s => s.lat != null && s.lng != null)
      .map(s => [s.lng, s.lat]);
    const pts = fromGeometry.length > 1 ? fromGeometry : fromStops;
    if (!pts.length) return;
    // базата е част от курса — камионът тръгва и се връща там
    pts.push([26.0348, 43.8619]);
    mapRef.current?.fitTo(pts, { padLeft: panelOpen ? 310 : 0 });
  }, [selected, routeData, panelOpen]);

  // Деселектиране — връщаме общия поглед над целия парк.
  useEffect(() => {
    if (selected) return;
    const id = setTimeout(() => mapRef.current?.fitAll(), 150);
    return () => clearTimeout(id);
  }, [selected]);

  const liveCount = Object.keys(livePos).length;
  const simulatedCount = Object.values(livePos).filter(p => p?.simulated).length;
  const movingCount = activeTrips.filter(t => t.status === 'IN_PROGRESS').length;
  const plannedCount = activeTrips.filter(t => t.status === 'PLANNED').length;
  const totalStops = activeTrips.reduce((n, t) => n + (t.stops?.length || 0), 0);

  return (
    <div className="relative h-full w-full overflow-hidden bg-canvas">
      <FleetMap
        ref={mapRef}
        theme={dark ? 'dark' : 'light'}
        livePositions={livePos}
        routes={mapRoutes}
        stops={mapStops}
        sites={sites}
        showTrails={trails}
        pitch={pitched ? 48 : 0}
        onStopClick={onStopClick}
      />

      {/* ── горна лента ───────────────────────────────────────────────── */}
      <div className="absolute top-3 left-3 right-3 z-10 flex items-start justify-between gap-3 pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="flex items-center gap-2.5 bg-surface/92 backdrop-blur border border-line
                          rounded-lg shadow-md px-3 py-2">
            <span className={cx('relative flex h-2 w-2', liveCount ? 'text-ok' : 'text-ink-3')}>
              {liveCount > 0 && (
                <span className="absolute inline-flex h-full w-full rounded-full bg-current opacity-60 animate-ping" />
              )}
              <span className="relative inline-flex h-2 w-2 rounded-full bg-current" />
            </span>
            <span className="text-xs font-semibold text-ink tabular">
              {liveCount} {liveCount === 1 ? 'машина' : 'машини'} на живо
            </span>
            {simulatedCount > 0 && (
              <Badge tone="neutral" className="ml-1">
                {simulatedCount === liveCount ? 'симулация' : `${simulatedCount} симулирани`}
              </Badge>
            )}
          </div>

          {!panelOpen && (
            <Button size="sm" variant="secondary" icon={Layers}
              className="bg-surface/92 backdrop-blur shadow-md"
              onClick={() => setPanelOpen(true)}>Курсове</Button>
          )}
        </div>

        <div className="flex items-center gap-1.5 bg-surface/92 backdrop-blur border border-line
                        rounded-lg shadow-md p-1 pointer-events-auto">
          <IconButton icon={Waypoints} label={trails ? 'Скрий следите' : 'Покажи следите'} size="sm"
            variant={trails ? 'subtle' : 'ghost'}
            className={trails ? 'text-brand' : ''} onClick={() => setTrails(v => !v)} />
          <IconButton icon={Mountain} label={pitched ? 'Изглед отгоре' : 'Наклонен изглед'} size="sm"
            variant={pitched ? 'subtle' : 'ghost'}
            className={pitched ? 'text-brand' : ''} onClick={() => setPitched(v => !v)} />
          <IconButton icon={Maximize2} label="Побери всичко" size="sm"
            onClick={() => mapRef.current?.fitAll()} />
        </div>
      </div>

      {/* ── панел с курсове ───────────────────────────────────────────── */}
      {panelOpen && (
        <aside className="absolute top-16 left-3 bottom-3 z-10 w-[310px] max-w-[calc(100%-1.5rem)]
                          flex flex-col bg-surface/94 backdrop-blur-md border border-line
                          rounded-xl shadow-lg overflow-hidden animate-slide-up">
          <header className="flex items-center justify-between gap-2 px-4 py-3 border-b border-line shrink-0">
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-ink">Курсове днес</h2>
              <p className="text-xs text-ink-3 mt-0.5 tabular">
                {movingCount} в движение · {plannedCount} планирани · {totalStops} спирки
              </p>
            </div>
            <IconButton icon={X} label="Затвори панела" size="sm" onClick={() => setPanelOpen(false)} />
          </header>

          <div className="overflow-y-auto grow">
            {loading ? (
              <div className="flex justify-center py-14"><Loader2 className="animate-spin text-brand" size={20} /></div>
            ) : activeTrips.length === 0 ? (
              <EmptyState icon={RouteIcon} title="Няма активни курсове"
                description="Когато диспечерът планира курс, той се появява тук и на картата." />
            ) : (
              <ul className="divide-y divide-line">
                {activeTrips.map(t => {
                  const active = t.id === selectedId;
                  const done = (t.stops || []).filter(s => s.status === 'COMPLETED').length;
                  const total = (t.stops || []).length;
                  const pct = total ? Math.round((done / total) * 100) : 0;
                  const pos = livePos[t.truck?.id];
                  return (
                    <li key={t.id}>
                      <div
                        role="button" tabIndex={0}
                        onClick={() => setSelectedId(active ? null : t.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedId(active ? null : t.id); }
                        }}
                        className={cx('w-full text-left px-4 py-3 transition-colors cursor-pointer',
                          'focus-visible:outline-2 focus-visible:outline-brand',
                          active ? 'bg-brand-soft' : 'hover:bg-raised')}>
                        <div className="flex items-center gap-2.5">
                          <span className="h-7 w-7 rounded-md grid place-items-center shrink-0 text-white"
                            style={{ background: t.truck?.color || '#64748b' }}>
                            <Truck size={14} strokeWidth={2} />
                          </span>
                          <div className="min-w-0 grow">
                            <p className="text-sm font-semibold text-ink truncate">
                              {t.truck?.plate || 'Без номер'}
                            </p>
                            <p className="text-xs text-ink-3 truncate">
                              {t.truck?.driver?.name || 'Без шофьор'}
                            </p>
                          </div>
                          {pos && (
                            <span
                              title={pos.simulated ? 'Симулирана позиция' : 'Реален GPS от шофьора'}
                              className={cx('shrink-0', pos.simulated ? 'text-ink-3' : 'text-ok')}>
                              <Radio size={13} strokeWidth={2.2} />
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 mt-2.5">
                          <Badge tone={TripTone[t.status] || 'neutral'} dot>
                            {TRIP_LABEL[t.status] || t.status}
                          </Badge>
                          <span className="text-xs text-ink-3 tabular ml-auto">{done}/{total} спирки</span>
                        </div>

                        <div className="h-1 rounded-full bg-sunken overflow-hidden mt-2">
                          <div className="h-full rounded-full transition-all duration-500 ease-swift"
                            style={{ width: `${pct}%`, background: t.truck?.color || '#64748b' }} />
                        </div>

                        {pos && (
                          <div className="flex items-center gap-3 mt-2 text-xs text-ink-3 tabular">
                            <span className="flex items-center gap-1">
                              <Navigation size={11} />{Math.round(pos.speed || 0)} км/ч
                            </span>
                            <button
                              onClick={(e) => { e.stopPropagation(); mapRef.current?.flyTo(pos.lat, pos.lng, 15); }}
                              className="flex items-center gap-1 hover:text-brand transition-colors ml-auto">
                              <Crosshair size={11} />Проследи
                            </button>
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {selected && (
            <footer className="border-t border-line px-4 py-3 bg-raised shrink-0">
              {routeLoading ? (
                <p className="text-xs text-ink-3 flex items-center gap-2">
                  <Loader2 size={12} className="animate-spin" />Зарежда маршрута…
                </p>
              ) : routeData ? (
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-ink-3">Разстояние</p>
                    <p className="font-semibold text-ink tabular">
                      {routeData.distanceKm?.toFixed?.(1) ?? routeData.totalKm ?? '—'} км
                    </p>
                  </div>
                  <div>
                    <p className="text-ink-3">Спирки</p>
                    <p className="font-semibold text-ink tabular">{selected.stops?.length || 0}</p>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-ink-3">Няма изчислен маршрут за този курс.</p>
              )}
            </footer>
          )}
        </aside>
      )}
    </div>
  );
}
