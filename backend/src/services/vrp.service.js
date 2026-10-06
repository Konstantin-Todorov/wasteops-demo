const { getDistanceMatrix, getRoute } = require('./osrm.service');

async function optimizeRoutes({ hq, stops, trucks }) {
  const allPoints = [hq, ...stops];
  const { distances } = await getDistanceMatrix(allPoints);

  const routes = nearestNeighborVRP(stops, trucks, distances);
  const improved = routes.map(r => twoOpt(r, distances));

  const result = await Promise.all(improved.map(async (stopIndices, i) => {
    const truck = trucks[i];
    const routePoints = [hq, ...stopIndices.map(idx => stops[idx]), hq];
    const { geometry, distanceKm, durationMin } = await getRoute(routePoints);

    // Базата за сравнение: СЪЩИТЕ спирки, в реда на постъпване на заявките,
    // мерени по същия начин — по реалните пътища. Сравнение на пътно
    // разстояние срещу права линия дава безсмислени проценти.
    const original = [...stopIndices].sort((a, b) => a - b);
    const baselinePoints = [hq, ...original.map(idx => stops[idx]), hq];
    const baseline = original.length
      ? await getRoute(baselinePoints).catch(() => ({ distanceKm: distanceKm }))
      : { distanceKm: 0 };

    const totalWeight = stopIndices.reduce((sum, idx) => sum + (stops[idx].estimatedKg || 0), 0);
    const totalVolume = stopIndices.reduce((sum, idx) => sum + (stops[idx].volumeM3 || 0), 0);

    return {
      truck,
      stops: stopIndices.map(idx => stops[idx]),
      geometry,
      totalKm: Math.round(distanceKm * 10) / 10,
      durationMin: Math.round(durationMin),
      loadWeightKg: totalWeight,
      loadVolumeM3: Math.round(totalVolume * 10) / 10,
      weightUtilization: truck.capacityKg ? Math.round(totalWeight / truck.capacityKg * 100) : 0,
      volumeUtilization: truck.capacityM3 ? Math.round(totalVolume / truck.capacityM3 * 100) : 0,
      baselineKm: Math.round((baseline.distanceKm || 0) * 10) / 10,
    };
  }));

  const totalKm = result.reduce((s, r) => s + r.totalKm, 0);
  // Спирките, които реално влязоха в план — в оригиналния си ред.
  const routedIds = new Set(result.flatMap(r => (r.stops || []).map(s => s.id)));
  const unassigned = stops.filter(s => !routedIds.has(s.id));
  const baseKm = result.reduce((s, r) => s + (r.baselineKm || 0), 0);

  return {
    routes: result,
    totalKm: Math.round(totalKm * 10) / 10,
    baselineKm: Math.round(baseKm * 10) / 10,
    kmSaved: Math.max(0, Math.round((baseKm - totalKm) * 10) / 10),
    savingPercent: baseKm > 0 ? Math.max(0, Math.round((baseKm - totalKm) / baseKm * 100)) : 0,
    // Прозрачност защо не всичко е разпределено — иначе изглежда като бъг.
    assignedCount: routedIds.size,
    unassignedCount: unassigned.length,
    unassigned: unassigned.slice(0, 50).map(s => ({
      id: s.id, clientName: s.clientName, address: s.address,
      estimatedKg: s.estimatedKg, volumeM3: s.volumeM3,
    })),
    reason: unassigned.length
      ? 'Капацитетът на наличните камиони не стига за всички заявки в един ден'
      : null,
  };
}

function nearestNeighborVRP(stops, trucks, distances) {
  const assigned = new Set();
  const routes = trucks.map(() => []);
  const capacities = trucks.map(t => ({ kg: t.capacityKg, m3: t.capacityM3 }));
  const used = trucks.map(() => ({ kg: 0, m3: 0 }));

  for (let iter = 0; iter < stops.length; iter++) {
    let bestTruck = -1, bestStop = -1, bestDist = Infinity;

    for (let t = 0; t < trucks.length; t++) {
      const lastIdx = routes[t].length > 0
        ? stops[routes[t][routes[t].length - 1]].pointIndex
        : 0;

      for (let s = 0; s < stops.length; s++) {
        if (assigned.has(s)) continue;
        const stop = stops[s];
        const newKg = used[t].kg + (stop.estimatedKg || 0);
        const newM3 = used[t].m3 + (stop.volumeM3 || 0);
        if (newKg > capacities[t].kg * 1.05) continue;
        if (newM3 > capacities[t].m3 * 1.05) continue;

        const dist = distances[lastIdx][s + 1];
        if (dist < bestDist) {
          bestDist = dist;
          bestStop = s;
          bestTruck = t;
        }
      }
    }

    if (bestStop === -1) break;
    routes[bestTruck].push(bestStop);
    used[bestTruck].kg += stops[bestStop].estimatedKg || 0;
    used[bestTruck].m3 += stops[bestStop].volumeM3 || 0;
    assigned.add(bestStop);
  }

  return routes;
}

function twoOpt(route, distances) {
  if (route.length < 4) return route;
  let improved = true;
  let best = [...route];

  while (improved) {
    improved = false;
    for (let i = 1; i < best.length - 2; i++) {
      for (let j = i + 1; j < best.length; j++) {
        const d1 = distances[best[i - 1] + 1][best[i] + 1] + distances[best[j] + 1][(best[j + 1] ?? 0) === 0 ? 0 : best[j + 1] + 1];
        const d2 = distances[best[i - 1] + 1][best[j] + 1] + distances[best[i] + 1][(best[j + 1] ?? 0) === 0 ? 0 : best[j + 1] + 1];
        if (d2 < d1 - 1) {
          best = [...best.slice(0, i), ...best.slice(i, j + 1).reverse(), ...best.slice(j + 1)];
          improved = true;
        }
      }
    }
  }
  return best;
}

module.exports = { optimizeRoutes };
