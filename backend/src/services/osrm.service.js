const https = require('https');
const http = require('http');

const OSRM_BASE = 'http://router.project-osrm.org';

function httpGet(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

async function getDistanceMatrix(points) {
  const coords = points.map(p => `${p.lng},${p.lat}`).join(';');
  const url = `${OSRM_BASE}/table/v1/driving/${coords}?annotations=duration,distance`;
  try {
    const data = await httpGet(url);
    if (data.code !== 'Ok') throw new Error('OSRM error: ' + data.code);
    return {
      durations: data.durations,
      distances: data.distances
    };
  } catch (err) {
    console.warn('OSRM unavailable, using haversine fallback:', err.message);
    return haversineMatrix(points);
  }
}

async function getRoute(points) {
  const coords = points.map(p => `${p.lng},${p.lat}`).join(';');
  const url = `${OSRM_BASE}/route/v1/driving/${coords}?overview=full&geometries=geojson&steps=false`;
  try {
    const data = await httpGet(url);
    if (data.code !== 'Ok') throw new Error('OSRM route error');
    const route = data.routes[0];
    return {
      geometry: route.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
      distanceKm: route.distance / 1000,
      durationMin: route.duration / 60
    };
  } catch (err) {
    console.warn('OSRM route unavailable, using straight lines');
    return {
      geometry: points.map(p => [p.lat, p.lng]),
      distanceKm: straightLineDistance(points),
      durationMin: straightLineDistance(points) * 2
    };
  }
}

function haversine(a, b) {
  const R = 6371;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;
  const x = Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function haversineMatrix(points) {
  const n = points.length;
  const distances = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => haversine(points[i], points[j]) * 1000)
  );
  const durations = distances.map(row => row.map(d => d / 13.9));
  return { distances, durations };
}

function straightLineDistance(points) {
  let total = 0;
  for (let i = 0; i < points.length - 1; i++) {
    total += haversine(points[i], points[i + 1]);
  }
  return total;
}

module.exports = { getDistanceMatrix, getRoute, haversine };
