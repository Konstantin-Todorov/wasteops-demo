const { getRoute } = require('./osrm.service');
const prisma = require('../lib/prisma');

const simulations = new Map();

function setupSimulation(io) {
  io.on('connection', (socket) => {
    socket.on('start_simulation', async ({ tripId }) => {
      if (simulations.has(tripId)) return;
      await runSimulation(io, tripId);
    });

    socket.on('stop_simulation', ({ tripId }) => {
      stopSimulation(tripId);
    });

    socket.on('join_trip', ({ tripId }) => {
      socket.join(`trip_${tripId}`);
    });
  });
}


// Посоката в градуси (0 = север), за да се завърта иконата на камиона.
function bearing(from, to) {
  const toRad = d => (d * Math.PI) / 180;
  const y = Math.sin(toRad(to.lng - from.lng)) * Math.cos(toRad(to.lat));
  const x = Math.cos(toRad(from.lat)) * Math.sin(toRad(to.lat)) -
            Math.sin(toRad(from.lat)) * Math.cos(toRad(to.lat)) * Math.cos(toRad(to.lng - from.lng));
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

// Приблизително разстояние в метри между две точки.
function metersBetween(a, b) {
  const R = 6371000, toRad = d => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

async function runSimulation(io, tripId) {
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: { stops: { orderBy: { sequence: 'asc' } }, truck: true }
  });
  if (!trip || trip.stops.length === 0) return { started: false, reason: 'no-stops' };

  if (simulations.has(tripId)) return { started: false, reason: 'already-running' };

  // Един камион не може да кара два курса едновременно. Без тази проверка
  // две симулации пращат позиции под един и същ truckId и следата на картата
  // скача между двата маршрута.
  for (const [otherTripId, entry] of simulations) {
    if (entry?.truckId === trip.truckId) {
      return { started: false, reason: 'truck-busy', busyWith: otherTripId };
    }
  }

  await prisma.trip.update({ where: { id: tripId }, data: { status: 'IN_PROGRESS', startedAt: new Date() } });

  const HQ = { lat: 43.861917, lng: 26.034763 };
  const waypoints = [
    HQ,
    ...trip.stops.map(s => ({ lat: s.lat, lng: s.lng, stopId: s.id, orderId: s.orderId, stopType: s.stopType })),
    HQ,
  ];

  // Камионът се движи по реалните пътища, не по права линия. За всеки участък
  // между две спирки вземаме геометрията от OSRM и я преобразуваме в равномерни
  // стъпки — така движението е плавно независимо от дължината на участъка.
  const STEPS_PER_LEG = 55;

  function resample(geom, n) {
    if (geom.length < 2) return geom;
    // натрупано разстояние по пътя
    const cum = [0];
    for (let i = 1; i < geom.length; i++) cum.push(cum[i - 1] + metersBetween(geom[i - 1], geom[i]));
    const total = cum[cum.length - 1];
    if (total === 0) return [geom[0]];
    const out = [];
    for (let k = 0; k < n; k++) {
      const target = (total * k) / (n - 1 || 1);
      let i = 1;
      while (i < cum.length - 1 && cum[i] < target) i++;
      const span = cum[i] - cum[i - 1] || 1;
      const f = (target - cum[i - 1]) / span;
      out.push({
        lat: geom[i - 1].lat + (geom[i].lat - geom[i - 1].lat) * f,
        lng: geom[i - 1].lng + (geom[i].lng - geom[i - 1].lng) * f,
      });
    }
    return out;
  }

  // path[] са всички позиции подред; legEnds[] казва на кой индекс свършва
  // всеки участък, за да знаем кога камионът е стигнал спирка.
  const path = [];
  const legEnds = [];
  const legKm = [];
  let onRoads = true;

  for (let i = 0; i < waypoints.length - 1; i++) {
    const r = await getRoute([waypoints[i], waypoints[i + 1]]);
    if (r.source !== 'osrm') onRoads = false;
    const geom = (r.geometry || []).map(([lat, lng]) => ({ lat, lng }));
    const sampled = geom.length > 1 ? resample(geom, STEPS_PER_LEG)
                                    : [waypoints[i], waypoints[i + 1]];
    // първата точка я пропускаме след първия участък, за да няма дублиране
    path.push(...(i === 0 ? sampled : sampled.slice(1)));
    legEnds.push(path.length - 1);
    legKm.push(r.distanceKm || 0);
  }

  if (!onRoads) {
    console.warn(`[sim] курс ${tripId}: маршрутизацията по пътища не е налична — движение по права линия`);
  }

  let cursor = 0;      // къде сме по path[]
  let legIndex = 0;    // кой участък изминаваме
  const INTERVAL_MS = 700;

  const interval = setInterval(async () => {
    if (!simulations.has(tripId)) { clearInterval(interval); return; }

    if (cursor >= path.length - 1) {
      clearInterval(interval);
      simulations.delete(tripId);
      await prisma.trip.update({ where: { id: tripId }, data: { status: 'COMPLETED', completedAt: new Date() } });
      io.emit('simulation_complete', { tripId });
      return;
    }

    const here = path[cursor];
    const next = path[Math.min(cursor + 1, path.length - 1)];

    // Скоростта се извежда от дължината на участъка — градско бавно,
    // извънградско по-бързо. Суровата скорост е безсмислена, защото
    // симулацията свива времето.
    const km = legKm[legIndex] || 0;
    const base = km < 2 ? 28 : km < 10 ? 46 : 64;
    const kmh = Math.max(5, Math.round(base + Math.sin(cursor / 5) * 6));

    io.emit('truck_position', {
      tripId,
      truckId:  trip.truckId,
      plate:    trip.truck.plate,
      color:    trip.truck.color,
      lat:      here.lat,
      lng:      here.lng,
      speed:    kmh,
      heading:  bearing(here, next),
      simulated: true,
      onRoads,
      stopIndex: legIndex,
      totalStops: trip.stops.length,
    });

    cursor++;

    // стигнахме ли края на текущия участък?
    if (legIndex < legEnds.length && cursor >= legEnds[legIndex]) {
      const arrived = waypoints[legIndex + 1];
      legIndex++;

      if (arrived?.stopId) {
        try {
          const stop = await prisma.tripStop.update({
            where: { id: arrived.stopId },
            data: { status: 'COMPLETED', arrivedAt: new Date(), completedAt: new Date() },
          });
          io.emit('stop_updated', { tripId, stop });
        } catch { /* спирката може вече да е затворена ръчно */ }
      }
    }
  }, INTERVAL_MS);

  simulations.set(tripId, { interval, truckId: trip.truckId });
  return { started: true, onRoads, points: path.length };
}

function stopSimulation(tripId) {
  const entry = simulations.get(tripId);
  if (entry) {
    clearInterval(entry.interval);
    simulations.delete(tripId);
  }
}

module.exports = { setupSimulation, runSimulation, stopSimulation };
