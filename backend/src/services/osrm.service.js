const http = require('http');
const https = require('https');

/**
 * Маршрутизация по реални пътища.
 *
 * Камионите трябва да се движат по пътищата — иначе и следата на картата, и
 * километрите, и разходът за гориво са грешни.
 *
 * ВАЖНО за production: публичният демо сървър на OSRM има ограничения за
 * ползване, може да откаже заявки и изисква интернет. На локалния сървър
 * вдигнете свой OSRM (виж README) и задайте OSRM_URL — тогава маршрутизацията
 * работи офлайн и без лимити.
 */
const OSRM_BASE = (process.env.OSRM_URL || 'https://router.project-osrm.org').replace(/\/$/, '');
const TIMEOUT_MS = Number(process.env.OSRM_TIMEOUT_MS || 8000);

// Демо сървърът връща 403 на заявки без User-Agent — Node не праща по подразбиране.
const HEADERS = { 'User-Agent': 'Logix-WasteOps/1.0 (fleet routing)', 'Accept': 'application/json' };

function httpGet(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, { headers: HEADERS, timeout: TIMEOUT_MS }, (res) => {
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`OSRM HTTP ${res.statusCode}`));
      }
      const ct = res.headers['content-type'] || '';
      if (!ct.includes('json')) {
        res.resume();
        return reject(new Error(`OSRM върна ${ct}, не JSON`));
      }
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error('OSRM: невалиден JSON — ' + e.message)); }
      });
    });
    req.on('timeout', () => { req.destroy(new Error(`OSRM timeout след ${TIMEOUT_MS}ms`)); });
    req.on('error', reject);
  });
}

/**
 * Една спирка с невалидни координати не бива да събаря маршрута на целия курс —
 * OSRM връща 400 за цялата заявка. Затова ги отсяваме преди да питаме.
 */
function validPoints(points) {
  return (points || []).filter(p =>
    p && Number.isFinite(p.lat) && Number.isFinite(p.lng) &&
    Math.abs(p.lat) <= 90 && Math.abs(p.lng) <= 180);
}

let degradedLogged = false;
function warnDegraded(what, err) {
  // Логваме веднъж, за да не залеем конзолата, но ясно — празните линии
  // на картата иначе изглеждат като наша грешка.
  if (!degradedLogged) {
    console.warn(`[osrm] ${what} не е наличен (${err.message}) — временно се ползват прави линии. ` +
                 `За production задайте OSRM_URL към собствен сървър.`);
    degradedLogged = true;
  }
}

async function getDistanceMatrix(rawPoints) {
  const points = validPoints(rawPoints);
  if (points.length < 2) return { ...haversineMatrix(rawPoints), source: 'straight-line' };
  const coords = points.map(p => `${p.lng},${p.lat}`).join(';');
  const url = `${OSRM_BASE}/table/v1/driving/${coords}?annotations=duration,distance`;
  try {
    const data = await httpGet(url);
    if (data.code !== 'Ok') throw new Error('OSRM: ' + data.code);
    return { durations: data.durations, distances: data.distances, source: 'osrm' };
  } catch (err) {
    warnDegraded('матрицата на разстоянията', err);
    return { ...haversineMatrix(points), source: 'straight-line' };
  }
}

async function getRoute(rawPoints) {
  const points = validPoints(rawPoints);
  if (points.length < 2) {
    const km = straightLineDistance(rawPoints);
    return { geometry: (rawPoints || []).map(p => [p.lat, p.lng]), distanceKm: km,
             durationMin: km * 2, source: 'straight-line', skipped: (rawPoints || []).length - points.length };
  }
  const coords = points.map(p => `${p.lng},${p.lat}`).join(';');
  const url = `${OSRM_BASE}/route/v1/driving/${coords}?overview=full&geometries=geojson&steps=false`;
  try {
    const data = await httpGet(url);
    if (data.code !== 'Ok') throw new Error('OSRM: ' + data.code);
    const route = data.routes[0];
    return {
      geometry: route.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
      distanceKm: route.distance / 1000,
      durationMin: route.duration / 60,
      source: 'osrm',
    };
  } catch (err) {
    warnDegraded('маршрутизацията', err);
    const km = straightLineDistance(points);
    // броим колко сме отсели, за да се вижда, че проблемът е в данните
    return {
      geometry: points.map(p => [p.lat, p.lng]),
      distanceKm: km,
      durationMin: km * 2,
      source: 'straight-line',
    };
  }
}

/** Проверка дали маршрутизацията по пътища работи — ползва се от /api/health. */
async function checkOsrm() {
  const probe = [{ lat: 43.861917, lng: 26.034763 }, { lat: 43.8564, lng: 25.9708 }];
  const started = Date.now();
  try {
    const r = await getRoute(probe);
    return { ok: r.source === 'osrm', source: r.source, base: OSRM_BASE, ms: Date.now() - started };
  } catch (err) {
    return { ok: false, source: 'error', base: OSRM_BASE, error: err.message };
  }
}

function haversine(a, b) {
  const R = 6371, toRad = d => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function haversineMatrix(points) {
  const n = points.length;
  const distances = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => haversine(points[i], points[j]) * 1000));
  const durations = distances.map(row => row.map(m => (m / 1000) * 90));
  return { durations, distances };
}

function straightLineDistance(points) {
  let km = 0;
  for (let i = 0; i < points.length - 1; i++) km += haversine(points[i], points[i + 1]);
  return km;
}

module.exports = { getDistanceMatrix, getRoute, checkOsrm, haversine };
