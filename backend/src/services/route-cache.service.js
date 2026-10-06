const crypto = require('crypto');
const { getRoute } = require('./osrm.service');
const prisma = require('../lib/prisma');

/**
 * Кеш за маршрутите в базата.
 *
 * Пресмятането по реални пътища е мрежова заявка. Един и същ курс се отваря
 * десетки пъти на ден — от картата, от симулацията, от панела — а спирките
 * се менят рядко. Затова геометрията се смята веднъж и се пази в
 * `Trip.routeJson`, докато наборът от спирки не се промени.
 */

/** Ключ, който се мени само когато спирките или редът им се променят. */
function pointsKey(points) {
  const s = points.map(p => `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`).join('|');
  return crypto.createHash('sha1').update(s).digest('hex').slice(0, 16);
}

/**
 * Връща геометрията по пътищата за даден курс, кеширана в базата.
 * При промяна на спирките кешът се обезсилва автоматично.
 */
async function getTripRoute(tripId, points, { force = false } = {}) {
  const key = pointsKey(points);

  if (!force) {
    const trip = await prisma.trip.findUnique({ where: { id: tripId }, select: { routeJson: true } });
    const cached = trip?.routeJson;
    if (cached?.key === key && Array.isArray(cached.geometry) && cached.geometry.length > 1) {
      return { ...cached, cached: true };
    }
  }

  const fresh = await getRoute(points);

  // Прави линии не се кешират — иначе една мрежова грешка се запечатва трайно
  // и курсът завинаги остава с грешни километри.
  if (fresh.source === 'osrm') {
    await prisma.trip.update({
      where: { id: tripId },
      data: { routeJson: { key, ...fresh, computedAt: new Date().toISOString() } },
    }).catch(() => {});
  }

  return { ...fresh, cached: false };
}

/** Изчиства кеша на курс — ползва се при добавяне или пренареждане на спирки. */
async function invalidateTripRoute(tripId) {
  await prisma.trip.update({ where: { id: tripId }, data: { routeJson: null } }).catch(() => {});
}

module.exports = { getTripRoute, invalidateTripRoute, pointsKey };
