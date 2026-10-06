import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Check, Fuel, Loader2, MapPin, Package, Route as RouteIcon, Save,
  Sparkles, TrendingDown, Truck, Weight,
} from 'lucide-react';
import { api } from '../../lib/api';
import FleetMap from '../../components/map/FleetMap';
import {
  Badge, Button, Card, EmptyState, PageHeader, Stat, cx, useToast,
} from '../../components/ui';

/** Следи дали приложението е в тъмна тема, за да смени и стила на картата. */
function useDarkTheme() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));
  useEffect(() => {
    const ob = new MutationObserver(() => setDark(document.documentElement.classList.contains('dark')));
    ob.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => ob.disconnect();
  }, []);
  return dark;
}

const fmt = (n, d = 1) => (n == null ? '—' : Number(n).toFixed(d));

export default function RouteOptimizer() {
  const { toast, confirm } = useToast();
  const dark = useDarkTheme();
  const mapRef = useRef(null);

  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState(null);
  const [optimizing, setOptimizing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTruck, setActiveTruck] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const orders = await api.get('/orders?status=CONFIRMED').catch(() => []);
      setPending(Array.isArray(orders) ? orders : []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function optimize() {
    setOptimizing(true);
    try {
      const r = await api.post('/vrp/optimize', {});
      setResult(r);
      setActiveTruck(null);
      const n = (r.routes || []).reduce((s, x) => s + (x.stops?.length || 0), 0);
      toast.success(`${n} спирки разпределени в ${r.routes?.length || 0} курса`);
    } catch (e) {
      toast.error(e.message);
    } finally { setOptimizing(false); }
  }

  async function save() {
    if (!result?.routes?.length) return;
    const n = result.routes.reduce((s, x) => s + (x.stops?.length || 0), 0);
    const yes = await confirm({
      title: 'Запазване на плана',
      description: `Ще бъдат създадени ${result.routes.length} курса с общо ${n} спирки. Заявките преминават в планирано състояние.`,
      confirmLabel: 'Запази курсовете',
    });
    if (!yes) return;

    setSaving(true);
    try {
      await api.post('/vrp/save', { routes: result.routes, date: new Date().toISOString() });
      toast.success('Курсовете са създадени');
      setResult(null);
      load();
    } catch (e) {
      toast.error(e.message);
    } finally { setSaving(false); }
  }

  /* ── данни за картата ─────────────────────────────────────────────────── */
  const shown = useMemo(
    () => (result?.routes || []).filter(r => !activeTruck || r.truck?.id === activeTruck),
    [result, activeTruck]);

  const mapRoutes = useMemo(() => shown
    .filter(r => r.geometry?.length > 1)
    .map(r => ({ id: r.truck?.id, color: r.truck?.color || '#6366f1', geometry: r.geometry })),
    [shown]);

  const mapStops = useMemo(() => shown.flatMap(r =>
    (r.stops || []).map(s => ({
      id: s.id, lat: s.lat, lng: s.lng, sequence: s.pointIndex,
      status: 'PENDING', label: s.clientName, address: s.address,
    }))), [shown]);

  // Щом планът е готов, показваме го целия — иначе не се вижда какво е постигнато.
  useEffect(() => {
    if (!mapRoutes.length) return;
    const pts = mapRoutes.flatMap(r => r.geometry.map(([lat, lng]) => [lng, lat]));
    const id = setTimeout(() => mapRef.current?.fitTo(pts, { maxZoom: 13 }), 250);
    return () => clearTimeout(id);
  }, [mapRoutes]);

  const totals = useMemo(() => {
    if (!result) return null;
    const routes = result.routes || [];
    return {
      trucks: routes.length,
      stops: routes.reduce((s, r) => s + (r.stops?.length || 0), 0),
      km: result.totalKm,
      saved: result.kmSaved,
      percent: result.savingPercent,
      baseline: result.baselineKm,
      litres: result.kmSaved != null ? (result.kmSaved * 0.38) : null,
      assigned: result.assignedCount,
      unassigned: result.unassignedCount,
      reason: result.reason,
    };
  }, [result]);

  return (
    <div className="p-4 lg:p-6 max-w-[1600px] mx-auto">
      <PageHeader
        title="Оптимизация на маршрути"
        sub="Разпределя потвърдените заявки по камиони и подрежда спирките по най-късия път"
        actions={
          <>
            <Button variant="secondary" onClick={load} disabled={loading}>Обнови</Button>
            <Button variant="primary" icon={Sparkles} loading={optimizing}
              onClick={optimize} disabled={!pending.length}>
              Изчисли план
            </Button>
            {result && (
              <Button variant="secondary" icon={Save} loading={saving} onClick={save}>
                Запази курсовете
              </Button>
            )}
          </>
        }
      />

      {/* ── показатели ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <Stat label="Чакащи заявки" value={pending.length} icon={Package}
          tone={pending.length ? 'warn' : 'neutral'}
          trend={totals ? `${totals.assigned} разпределени в този план` : null} />
        <Stat label="Курсове в плана" value={totals?.trucks ?? '—'} icon={Truck}
          tone={totals ? 'brand' : 'neutral'} />
        <Stat label="Общо разстояние" value={totals ? fmt(totals.km) : '—'} unit="км"
          icon={RouteIcon} tone="info" />
        <Stat label="Спестени километри" value={totals?.saved != null ? fmt(totals.saved) : '—'} unit="км"
          icon={TrendingDown} tone={totals?.saved > 0 ? 'ok' : 'neutral'}
          trend={totals?.percent != null ? `${fmt(totals.percent, 0)}% спрямо неоптимизиран маршрут` : null} />
      </div>

      <div className="grid lg:grid-cols-[1fr_360px] gap-4">
        {/* ── карта ─────────────────────────────────────────────────────── */}
        <Card className="overflow-hidden h-[460px] lg:h-[620px] relative">
          <FleetMap
            ref={mapRef}
            theme={dark ? 'dark' : 'light'}
            routes={mapRoutes}
            stops={mapStops}
            showTrails={false}
            onStopClick={(s) => mapRef.current?.flyTo(s.lat, s.lng, 15)}
          />
          {!result && (
            <div className="absolute inset-0 grid place-items-center bg-canvas/70 backdrop-blur-[1px] pointer-events-none">
              <div className="text-center px-6 pointer-events-auto">
                <div className="mx-auto h-12 w-12 rounded-xl bg-surface border border-line
                                grid place-items-center shadow-sm mb-3">
                  <Sparkles size={20} className="text-brand" />
                </div>
                <p className="text-base font-semibold text-ink">Още няма изчислен план</p>
                <p className="text-sm text-ink-3 mt-1 max-w-xs">
                  {pending.length
                    ? `${pending.length} потвърдени заявки чакат разпределение.`
                    : 'Няма потвърдени заявки за разпределяне.'}
                </p>
              </div>
            </div>
          )}
        </Card>

        {/* ── курсове от плана ──────────────────────────────────────────── */}
        <Card className="flex flex-col max-h-[620px]">
          <div className="px-4 py-3 border-b border-line shrink-0">
            <h3 className="text-sm font-semibold text-ink">Разпределение по камиони</h3>
            {totals && (
              <p className="text-xs text-ink-3 mt-0.5 tabular">
                {totals.stops} спирки · {fmt(totals.km)} км
                {totals.litres != null && ` · ~${fmt(totals.litres, 0)} л спестено гориво`}
              </p>
            )}
          </div>

          <div className="overflow-y-auto grow">
            {!result ? (
              <EmptyState icon={Truck} title="Няма план"
                description="Натиснете „Изчисли план“, за да разпределите заявките." />
            ) : (
              <ul className="divide-y divide-line">
                {(result.routes || []).map(r => {
                  const on = activeTruck === r.truck?.id;
                  return (
                    <li key={r.truck?.id}>
                      <button
                        onClick={() => setActiveTruck(on ? null : r.truck?.id)}
                        className={cx('w-full text-left px-4 py-3 transition-colors',
                          on ? 'bg-brand-soft' : 'hover:bg-raised')}>
                        <div className="flex items-center gap-2.5">
                          <span className="h-7 w-7 rounded-md grid place-items-center shrink-0 text-white"
                            style={{ background: r.truck?.color || '#64748b' }}>
                            <Truck size={14} strokeWidth={2} />
                          </span>
                          <div className="min-w-0 grow">
                            <p className="text-sm font-semibold text-ink truncate">{r.truck?.plate}</p>
                            <p className="text-xs text-ink-3 truncate">{r.truck?.driver?.name || 'Без шофьор'}</p>
                          </div>
                          <Badge tone={on ? 'brand' : 'neutral'}>{r.stops?.length || 0} спирки</Badge>
                        </div>

                        <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
                          <div>
                            <p className="text-ink-3">Разстояние</p>
                            <p className="font-semibold text-ink tabular">{fmt(r.totalKm)} км</p>
                          </div>
                          <div>
                            <p className="text-ink-3">Време</p>
                            <p className="font-semibold text-ink tabular">{fmt(r.durationMin, 0)} мин</p>
                          </div>
                          <div>
                            <p className="text-ink-3">Натоварване</p>
                            <p className="font-semibold text-ink tabular">
                              {fmt(r.weightUtilization, 0)}%
                            </p>
                          </div>
                        </div>

                        {/* Запълване на камиона — ако е над 100%, планът е нереалистичен */}
                        <div className="flex gap-2 mt-2.5" title="Тегло и обем спрямо капацитета">
                          {[['Тегло', r.weightUtilization, Weight], ['Обем', r.volumeUtilization, Package]]
                            .map(([label, v, Icon]) => {
                              const pct = Math.min(100, Math.round(v || 0));
                              const over = (v || 0) > 100;
                              return (
                                <div key={label} className="grow">
                                  <div className="flex items-center gap-1 text-2xs text-ink-3 mb-1">
                                    <Icon size={10} />{label}
                                  </div>
                                  <div className="h-1.5 rounded-full bg-sunken overflow-hidden">
                                    <div className={cx('h-full rounded-full transition-all',
                                      over ? 'bg-danger' : 'bg-brand')} style={{ width: `${pct}%` }} />
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {result && (
            <div className="border-t border-line px-4 py-3 bg-raised shrink-0 flex items-center gap-2">
              <Fuel size={14} className="text-ink-3 shrink-0" />
              <p className="text-xs text-ink-2">
                {totals?.saved > 0
                  ? <>Планът спестява <b className="text-ok">{fmt(totals.saved)} км</b> спрямо неоптимизиран маршрут.</>
                  : 'Планът е изчислен.'}
              </p>
            </div>
          )}
        </Card>
      </div>

      {/* Капацитетът е реално ограничение, не грешка — казваме го ясно. */}
      {totals?.unassigned > 0 && (
        <Card className="mt-4 border-warn/30 bg-warn-soft/40">
          <div className="px-4 py-3 flex items-start gap-3">
            <Weight size={16} className="text-warn shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-ink">
                {totals.unassigned} заявки остават извън плана
              </p>
              <p className="text-xs text-ink-2 mt-1 leading-relaxed">
                {totals.reason}. Камионите са запълнени по обем или тегло.
                Разпределете останалите за следващ ден или добавете курс.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* ── чакащи заявки ────────────────────────────────────────────────── */}
      {!loading && pending.length > 0 && (
        <Card className="mt-4">
          <div className="px-4 py-3 border-b border-line flex items-center justify-between">
            <h3 className="text-sm font-semibold text-ink">Потвърдени заявки за разпределяне</h3>
            <Badge tone="warn">{pending.length}</Badge>
          </div>
          <ul className="divide-y divide-line max-h-64 overflow-y-auto">
            {pending.map(o => (
              <li key={o.id} className="px-4 py-2.5 flex items-center gap-3 text-sm">
                <MapPin size={13} className="text-ink-3 shrink-0" />
                <span className="font-medium text-ink truncate">{o.client?.name}</span>
                <span className="text-ink-3 truncate grow">{o.address}</span>
                <Badge tone={o.orderType === 'CONTAINER' ? 'info' : 'neutral'}>
                  {o.orderType === 'CONTAINER' ? 'Контейнер' : 'Сметосъбирач'}
                </Badge>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {loading && (
        <div className="flex justify-center py-10"><Loader2 className="animate-spin text-brand" size={20} /></div>
      )}
    </div>
  );
}
