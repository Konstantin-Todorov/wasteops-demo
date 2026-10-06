import { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import { Map as MapLibreMap, Marker, NavigationControl, ScaleControl, LngLatBounds } from 'maplibre-gl';
import { MapboxOverlay } from '@deck.gl/mapbox';
import { TripsLayer } from '@deck.gl/geo-layers';
import { PathLayer, ScatterplotLayer } from '@deck.gl/layers';
import { getMapStyle } from '../../lib/mapStyle';
import 'maplibre-gl/dist/maplibre-gl.css';

const HQ = [26.0348, 43.8619];   // MapLibre иска [lng, lat]

/** Следите се трупат в рефа, не в state — иначе всяка GPS точка пречертава React дървото. */
const TRAIL_WINDOW_MS = 10 * 60 * 1000;  // колко назад пазим следата
const TRAIL_FADE = 90;                   // дължина на опашката в секунди
// GPS понякога „телепортира" машината с една грешна точка. Скок над този праг
// се приема за артефакт и следата се започва наново, вместо да се начертае
// линия през половин България.
const TELEPORT_METERS = 3000;

function metersBetween(a, b) {
  const R = 6371000, rad = d => (d * Math.PI) / 180;
  const dLat = rad(b[1] - a[1]), dLng = rad(b[0] - a[0]);
  const h = Math.sin(dLat / 2) ** 2 +
            Math.cos(rad(a[1])) * Math.cos(rad(b[1])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Пази MapLibre от NaN и разменени координати — иначе цялата карта пада. */
function isLngLat(lng, lat) {
  return Number.isFinite(lng) && Number.isFinite(lat) &&
         Math.abs(lng) <= 180 && Math.abs(lat) <= 90;
}

function hexToRgb(hex, fallback = [34, 197, 94]) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '');
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : fallback;
}

const FleetMap = forwardRef(function FleetMap({
  theme = 'light',
  livePositions = {},     // { truckId: { lat, lng, plate, color, speed, heading } }
  routes = [],            // [{ id, color, geometry: [[lat,lng],…] }]
  stops = [],             // [{ id, lat, lng, sequence, status, label }]
  sites = [],             // [{ id, lat, lng, name, radiusM }]
  showTrails = true,
  pitch = 0,
  onStopClick,
  className = '',
}, ref) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const overlayRef = useRef(null);
  const trailsRef = useRef({});          // truckId -> { path:[[lng,lat]], ts:[sec], color }
  const markersRef = useRef({});
  const rafRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [clock, setClock] = useState(0);

  useImperativeHandle(ref, () => ({
    flyTo: (lat, lng, zoom = 14) => {
      if (!isLngLat(lng, lat)) return;
      mapRef.current?.flyTo({ center: [lng, lat], zoom, duration: 1400, essential: true });
    },
    fitAll: () => fitToData(),
    /**
     * Побира картата до конкретен набор точки — ползва се при избор на курс,
     * за да се вижда целият маршрут, а не там, където камерата е останала.
     * `padLeft` оставя място за панела, иначе половината маршрут е под него.
     */
    fitTo: (coords, { padLeft = 0, maxZoom = 15 } = {}) => {
      const map = mapRef.current;
      const pts = (coords || []).filter(([lng, lat]) => isLngLat(lng, lat));
      if (!map || pts.length === 0) return;

      if (pts.length === 1) {
        map.easeTo({ center: pts[0], zoom: 14, duration: 900,
                     padding: { top: 60, bottom: 60, left: padLeft + 40, right: 40 } });
        return;
      }
      const b = pts.reduce((acc, p) => acc.extend(p), new LngLatBounds(pts[0], pts[0]));
      map.fitBounds(b, {
        padding: { top: 70, bottom: 70, left: padLeft + 50, right: 60 },
        maxZoom, duration: 1000,
      });
    },
    getMap: () => mapRef.current,
  }));

  /* ── инициализация ────────────────────────────────────────────────────── */
  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;
    const map = new MapLibreMap({
      container: containerRef.current,
      style: getMapStyle(theme),
      center: HQ,
      zoom: 10.5,
      pitch,
      bearing: 0,
      attributionControl: { compact: true },
      dragRotate: true,
    });
    map.addControl(new NavigationControl({ visualizePitch: true }), 'bottom-right');
    map.addControl(new ScaleControl({ maxWidth: 110, unit: 'metric' }), 'bottom-left');

    const overlay = new MapboxOverlay({ interleaved: false, layers: [] });
    map.addControl(overlay);

    mapRef.current = map;
    overlayRef.current = overlay;
    map.on('load', () => setReady(true));

    return () => {
      cancelAnimationFrame(rafRef.current);
      Object.values(markersRef.current).forEach(m => m.remove());
      markersRef.current = {};
      map.remove();
      mapRef.current = null;
      overlayRef.current = null;
    };
    // стилът се сменя отделно по-долу — тук инициализираме веднъж
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── смяна на темата ──────────────────────────────────────────────────── */
  useEffect(() => {
    if (!mapRef.current || !ready) return;
    mapRef.current.setStyle(getMapStyle(theme));
  }, [theme, ready]);

  /* ── часовник за анимацията ───────────────────────────────────────────── */
  useEffect(() => {
    if (!showTrails) return;
    let mounted = true;
    const tick = () => {
      if (!mounted) return;
      setClock(Date.now() / 1000);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { mounted = false; cancelAnimationFrame(rafRef.current); };
  }, [showTrails]);

  /* ── натрупване на следите + маркери за камионите ─────────────────────── */
  useEffect(() => {
    if (!mapRef.current || !ready) return;
    const now = Date.now();
    const map = mapRef.current;

    Object.entries(livePositions).forEach(([id, p]) => {
      if (!isLngLat(p?.lng, p?.lat)) return;

      // Следата се води по камион, но ако дойде позиция от друг курс или
      // GPS прескочи, започваме наново — иначе чертаем линия през нищото.
      const t = trailsRef.current[id] ||
        (trailsRef.current[id] = { path: [], ts: [], color: hexToRgb(p.color), tripId: p.tripId });

      if (p.tripId && t.tripId && p.tripId !== t.tripId) {
        t.path = []; t.ts = []; t.tripId = p.tripId;
      }
      t.tripId = p.tripId ?? t.tripId;

      const here = [p.lng, p.lat];
      const last = t.path[t.path.length - 1];
      if (last && metersBetween(last, here) > TELEPORT_METERS) {
        t.path = []; t.ts = [];
      }
      if (!last || last[0] !== here[0] || last[1] !== here[1]) {
        t.path.push(here);
        t.ts.push(now / 1000);
        t.color = hexToRgb(p.color);
        while (t.ts.length > 1 && now - t.ts[0] * 1000 > TRAIL_WINDOW_MS) { t.ts.shift(); t.path.shift(); }
      }

      // маркер
      let marker = markersRef.current[id];
      if (!marker) {
        const el = document.createElement('div');
        el.className = 'fleet-truck';
        el.innerHTML = `
          <span class="fleet-truck__pulse"></span>
          <span class="fleet-truck__body">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none"
                 stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 3 L19 20 L12 16 L5 20 Z"/>
            </svg>
          </span>
          <span class="fleet-truck__plate"></span>`;
        marker = new Marker({ element: el, anchor: 'center' })
          .setLngLat([p.lng, p.lat]).addTo(map);
        markersRef.current[id] = marker;
      }
      const el = marker.getElement();
      el.style.setProperty('--truck-color', p.color || '#22c55e');
      el.querySelector('.fleet-truck__plate').textContent = p.plate || '';
      el.classList.toggle('is-moving', (p.speed || 0) > 3);
      const body = el.querySelector('.fleet-truck__body');
      if (body) body.style.transform = `rotate(${p.heading ?? 0}deg)`;
      marker.setLngLat([p.lng, p.lat]);
    });

    // махаме маркери на камиони, които вече не се докладват
    Object.keys(markersRef.current).forEach(id => {
      if (!livePositions[id]) { markersRef.current[id].remove(); delete markersRef.current[id]; }
    });
  }, [livePositions, ready]);

  /* ── deck.gl слоеве ───────────────────────────────────────────────────── */
  useEffect(() => {
    if (!overlayRef.current || !ready) return;

    const trailData = Object.entries(trailsRef.current)
      .filter(([, t]) => t.path.length > 1)
      .map(([id, t]) => ({ id, path: t.path, timestamps: t.ts, color: t.color }));

    const layers = [];

    // планирани маршрути — под всичко останало
    if (routes.length) {
      layers.push(new PathLayer({
        id: 'routes',
        data: routes.filter(r => r.geometry?.length > 1),
        // геометрията идва като [lat,lng] от OSRM — обръща се при четене
        getPath: r => r.geometry.map(([lat, lng]) => [lng, lat]),
        getColor: r => [...hexToRgb(r.color, [99, 102, 241]), 70],
        getWidth: 5,
        widthUnits: 'pixels',
        widthMinPixels: 3,
        capRounded: true,
        jointRounded: true,
        pickable: false,
      }));
    }

    // спирки
    if (stops.length) {
      const stopColor = (s) =>
        s.status === 'COMPLETED' ? [26, 102, 55]
        : s.status === 'ISSUE_REPORTED' ? [176, 42, 42]
        : s.status === 'ARRIVED' ? [163, 94, 7]
        : [100, 116, 139];
      layers.push(new ScatterplotLayer({
        id: 'stops',
        data: stops.filter(s => isLngLat(s.lng, s.lat)),
        getPosition: s => [s.lng, s.lat],
        getFillColor: s => [...stopColor(s), 235],
        getLineColor: theme === 'dark' ? [13, 17, 23] : [255, 255, 255],
        lineWidthMinPixels: 2,
        stroked: true,
        radiusUnits: 'pixels',
        getRadius: 7,
        radiusMinPixels: 5,
        radiusMaxPixels: 11,
        pickable: true,
        onClick: ({ object }) => object && onStopClick?.(object),
      }));
    }

    // анимираните следи — това е „моушънът“
    if (showTrails && trailData.length) {
      layers.push(new TripsLayer({
        id: 'trails',
        data: trailData,
        getPath: d => d.path,
        getTimestamps: d => d.timestamps,
        getColor: d => d.color,
        currentTime: clock,
        trailLength: TRAIL_FADE,
        fadeTrail: true,
        widthUnits: 'pixels',
        getWidth: 4,
        widthMinPixels: 2.5,
        capRounded: true,
        jointRounded: true,
        opacity: 0.95,
        parameters: { cullMode: 'none' },
      }));
    }

    overlayRef.current.setProps({ layers });
  }, [routes, stops, showTrails, clock, ready, theme, onStopClick]);

  /* ── депа ─────────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!mapRef.current || !ready) return;
    const map = mapRef.current;
    const ids = [];
    sites.forEach(s => {
      if (!isLngLat(s.lng, s.lat)) return;
      const el = document.createElement('div');
      el.className = 'fleet-site';
      el.title = s.name || 'Депо';
      el.innerHTML = `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor"
        stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M3 21h18M5 21V8l7-5 7 5v13M9 21v-6h6v6"/></svg>`;
      const m = new Marker({ element: el, anchor: 'center' }).setLngLat([s.lng, s.lat]).addTo(map);
      ids.push(m);
    });
    // базата
    const hqEl = document.createElement('div');
    hqEl.className = 'fleet-hq';
    hqEl.title = 'База Logix';
    const hq = new Marker({ element: hqEl, anchor: 'center' }).setLngLat(HQ).addTo(map);
    ids.push(hq);
    return () => ids.forEach(m => m.remove());
  }, [sites, ready]);

  /* ── побиране на изгледа ──────────────────────────────────────────────── */
  const fitToData = useCallback(() => {
    const map = mapRef.current; if (!map) return;
    const pts = [
      HQ,
      ...Object.values(livePositions).map(p => [p?.lng, p?.lat]),
      ...stops.map(s => [s?.lng, s?.lat]),
    ].filter(([lng, lat]) => isLngLat(lng, lat));
    if (pts.length < 2) return;
    const b = pts.reduce((acc, p) => acc.extend(p), new LngLatBounds(pts[0], pts[0]));
    map.fitBounds(b, {
      padding: { top: 70, bottom: 70, left: 70, right: 70 },
      maxZoom: 13, duration: 1000,
    });
  }, [livePositions, stops]);

  useEffect(() => { if (ready) fitToData(); /* еднократно при зареждане */ // eslint-disable-next-line
  }, [ready]);

  return <div ref={containerRef} className={`fleet-map ${className}`} />;
});

export default FleetMap;
