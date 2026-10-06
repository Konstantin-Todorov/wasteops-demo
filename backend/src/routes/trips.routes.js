const express = require('express');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { validateBody, validateParamId } = require('../middleware/validate.middleware');
const S = require('../validation/schemas');
const prisma = require('../lib/prisma');

const router = express.Router();
// GET /api/trips - list all trips
router.get('/', authenticate, async (req, res) => {
  try {
    const { role, id: userId } = req.user;
    let trips;
    if (role === 'DRIVER') {
      const truck = await prisma.truck.findFirst({ where: { driverId: userId } });
      trips = truck
        ? await prisma.trip.findMany({
            where: { truckId: truck.id },
            include: {
              truck: { include: { driver: true } },
              disposalSite: true,
              stops: {
                include: { order: { include: { client: true } } },
                orderBy: { sequence: 'asc' }
              }
            },
            orderBy: { date: 'desc' }
          })
        : [];
    } else {
      trips = await prisma.trip.findMany({
        include: {
          truck: { include: { driver: true } },
          disposalSite: true,
          stops: {
            include: { order: { include: { client: true } } },
            orderBy: { sequence: 'asc' }
          }
        },
        orderBy: { date: 'desc' }
      });
    }
    res.json(trips);
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Записът не е намерен' });
    if (err.code === 'P2002') return res.status(409).json({ error: 'Вече съществува запис с тази стойност' });
    if (err.code === 'P2003') return res.status(409).json({ error: 'Записът е свързан с други данни' });
    res.status(500).json({ error: err.message });
  }
});

// GET /api/trips/today - today's trips with stops and truck info
router.get('/today', authenticate, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const trips = await prisma.trip.findMany({
      where: { date: { gte: today, lt: tomorrow } },
      include: {
        truck: {
          include: { driver: { select: { id: true, name: true } } }
        },
        disposalSite: true,
        stops: {
          include: { order: { include: { client: true } } },
          orderBy: { sequence: 'asc' }
        }
      }
    });
    res.json(trips);
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Записът не е намерен' });
    if (err.code === 'P2002') return res.status(409).json({ error: 'Вече съществува запис с тази стойност' });
    if (err.code === 'P2003') return res.status(409).json({ error: 'Записът е свързан с други данни' });
    res.status(500).json({ error: err.message });
  }
});

// GET /api/trips/:id - detail with stops and route logs
router.get('/:id', authenticate, async (req, res) => {
  try {
    const trip = await prisma.trip.findUnique({
      where: { id: req.params.id },
      include: {
        truck: { include: { driver: true } },
        disposalSite: true,
        stops: {
          include: { order: { include: { client: true } } },
          orderBy: { sequence: 'asc' }
        },
        routeLogs: { orderBy: { timestamp: 'asc' } }
      }
    });
    if (!trip) return res.status(404).json({ error: 'Маршрутът не е намерен' });
    res.json(trip);
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Записът не е намерен' });
    if (err.code === 'P2002') return res.status(409).json({ error: 'Вече съществува запис с тази стойност' });
    if (err.code === 'P2003') return res.status(409).json({ error: 'Записът е свързан с други данни' });
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/trips/:id/status - update trip status
router.patch('/:id/status', authenticate, authorize('ADMIN', 'DISPATCHER', 'DRIVER'), async (req, res) => {
  try {
    const { status } = req.body;
    const data = { status };
    if (status === 'IN_PROGRESS') data.startedAt = new Date();
    if (status === 'COMPLETED') data.completedAt = new Date();

    const trip = await prisma.trip.update({
      where: { id: req.params.id },
      data,
      include: { truck: { include: { driver: true } }, stops: true }
    });

    const { io } = require('../index');
    io.emit('trip_status_updated', { tripId: trip.id, status: trip.status });

    res.json(trip);
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Записът не е намерен' });
    if (err.code === 'P2002') return res.status(409).json({ error: 'Вече съществува запис с тази стойност' });
    if (err.code === 'P2003') return res.status(409).json({ error: 'Записът е свързан с други данни' });
    res.status(500).json({ error: err.message });
  }
});

// POST /api/trips/:id/unload - record unloading at disposal site
router.post('/:id/unload', authenticate, authorize('ADMIN', 'DISPATCHER', 'DRIVER'), async (req, res) => {
  try {
    const { unloadWeightKg, unloadWasteType, unloadNotes, unloadPhotos, disposalSiteId } = req.body;

    const trip = await prisma.trip.update({
      where: { id: req.params.id },
      data: {
        status: 'PENDING_VERIFICATION',
        unloadWeightKg,
        unloadWasteType,
        unloadNotes,
        unloadPhotos: unloadPhotos || [],
        ...(disposalSiteId ? { disposalSiteId } : {})
      },
      include: { truck: { include: { driver: true } }, disposalSite: true }
    });

    // Update all stops' orders to PENDING_VERIFICATION
    const stops = await prisma.tripStop.findMany({ where: { tripId: trip.id } });
    const orderIds = [...new Set(stops.map(s => s.orderId))];
    await prisma.order.updateMany({
      where: { id: { in: orderIds }, status: 'IN_TRANSIT' },
      data: { status: 'PENDING_VERIFICATION' }
    });

    // Разтоварените контейнери се освобождават обратно в наличност.
    await prisma.container.updateMany({
      where: { currentOrderId: { in: orderIds }, status: 'IN_TRANSIT' },
      data: { status: 'AVAILABLE', currentOrderId: null, currentLat: null, currentLng: null }
    });

    const { io } = require('../index');
    io.emit('trip_unloaded', { tripId: trip.id });

    res.json(trip);
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Записът не е намерен' });
    if (err.code === 'P2002') return res.status(409).json({ error: 'Вече съществува запис с тази стойност' });
    if (err.code === 'P2003') return res.status(409).json({ error: 'Записът е свързан с други данни' });
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/trips/:id/stops/reorder — update sequence + priority for all stops
// MUST be before /:id/stops/:stopId to avoid wildcard matching "reorder" as a stopId
router.patch('/:id/stops/reorder', authenticate, authorize('ADMIN', 'DISPATCHER'), async (req, res) => {
  try {
    const { stops } = req.body;
    if (!Array.isArray(stops)) return res.status(400).json({ error: 'stops трябва да е масив' });

    // Verify all stop IDs belong to this trip before updating
    const tripStops = await prisma.tripStop.findMany({
      where: { tripId: req.params.id },
      select: { id: true }
    });
    const validIds = new Set(tripStops.map(s => s.id));
    const toUpdate = stops.filter(s => s.id && validIds.has(s.id));

    if (toUpdate.length > 0) {
      await prisma.$transaction(
        toUpdate.map(s => prisma.tripStop.update({
          where: { id: s.id },
          data: { sequence: s.sequence, priority: s.priority ?? false }
        }))
      );
    }

    const updated = await prisma.trip.findUnique({
      where: { id: req.params.id },
      include: {
        stops: { orderBy: { sequence: 'asc' }, include: { order: { include: { client: { select: { id: true, name: true, type: true } } } } } },
        truck: { include: { driver: true } },
        disposalSite: true
      }
    });
    await require('../services/route-cache.service').invalidateTripRoute(req.params.id);

    res.json(updated);
  } catch (err) {
    console.error('Reorder error:', err.message, err.meta);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/trips/:id/stops/:stopId - update a stop's status
router.patch('/:id/stops/:stopId', authenticate, authorize('DRIVER', 'DISPATCHER', 'ADMIN'), async (req, res) => {
  try {
    const { status, issueNote, photos } = req.body;
    const data = { status };
    if (status === 'ARRIVED') data.arrivedAt = new Date();
    if (status === 'COMPLETED' || status === 'ISSUE_REPORTED') data.completedAt = new Date();
    if (issueNote) data.issueNote = issueNote;
    if (photos) data.photos = photos;

    const stop = await prisma.tripStop.update({
      where: { id: req.params.stopId },
      data,
      include: { order: { include: { client: true } } }
    });

    // Update order status on stop completion
    if (status === 'COMPLETED') {
      const stopType = stop.stopType;
      // DELIVERY → контейнерът е оставен и чака напълване (клиентът може да сигнализира).
      // PICKUP/LOAD → отпадъкът е на камиона и пътува към депото.
      let newOrderStatus = null;
      let eventType = null;
      if (stopType === 'DELIVERY')    { newOrderStatus = 'AWAITING_FILL'; eventType = 'container_delivered'; }
      else if (stopType === 'PICKUP') { newOrderStatus = 'IN_TRANSIT';    eventType = 'container_picked_up'; }
      else if (stopType === 'SWAP')   { newOrderStatus = 'IN_TRANSIT';    eventType = 'container_swapped'; }
      else if (stopType === 'LOAD')   { newOrderStatus = 'IN_TRANSIT';    eventType = 'waste_loaded'; }

      if (newOrderStatus) {
        await prisma.order.update({
          where: { id: stop.orderId },
          data: {
            status: newOrderStatus,
            events: { create: { eventType, userId: req.user.id, lat: stop.lat, lng: stop.lng } }
          }
        });
      }

      // Контейнерът следва спирката: оставен → DEPLOYED на адреса, вдигнат → IN_TRANSIT.
      // Връзката се пази на Container.currentOrderId (задава се при планиране на курса).
      const container = await prisma.container.findUnique({ where: { currentOrderId: stop.orderId } });
      if (container) {
        if (stopType === 'DELIVERY') {
          await prisma.container.update({
            where: { id: container.id },
            data: { status: 'DEPLOYED', currentLat: stop.lat, currentLng: stop.lng }
          });
        } else if (stopType === 'PICKUP' || stopType === 'SWAP') {
          // При размяна пълният тръгва към депото. Празният, който остава на
          // негово място, се заделя от диспечера при планирането на следващата
          // заявка за този адрес — затова тук само освобождаваме връзката.
          await prisma.container.update({
            where: { id: container.id },
            data: { status: 'IN_TRANSIT', ...(stopType === 'SWAP' ? { currentOrderId: null } : {}) }
          });
        }
      }
    }

    const { io } = require('../index');
    io.emit('stop_updated', { tripId: req.params.id, stop });

    res.json(stop);
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Записът не е намерен' });
    if (err.code === 'P2002') return res.status(409).json({ error: 'Вече съществува запис с тази стойност' });
    if (err.code === 'P2003') return res.status(409).json({ error: 'Записът е свързан с други данни' });
    res.status(500).json({ error: err.message });
  }
});

// Определя типа на спирката според вида на заявката И къде е тя в жизнения си цикъл.
// Контейнерна заявка минава през ДВЕ спирки: DELIVERY (оставяне на празен) и
// по-късно PICKUP (вземане на пълния). Преди тази поправка PICKUP никога не се създаваше.
const AWAITING_PICKUP_STATUSES = ['CONTAINER_DELIVERED', 'AWAITING_FILL', 'PICKUP_SCHEDULED'];

function resolveStopType(order, opts = {}) {
  if (order.orderType === 'GARBAGE_TRUCK') return 'LOAD';
  // Размяна: пълният контейнер се взема и празен се оставя в едно движение.
  // Спестява цял курс и е основна операция при мултилифт/скип.
  if (opts.swap && AWAITING_PICKUP_STATUSES.includes(order.status)) return 'SWAP';
  return AWAITING_PICKUP_STATUSES.includes(order.status) ? 'PICKUP' : 'DELIVERY';
}

function resolveScheduledStatus(stopType) {
  if (stopType === 'PICKUP' || stopType === 'SWAP') return 'PICKUP_SCHEDULED';
  if (stopType === 'DELIVERY') return 'DELIVERY_SCHEDULED';
  return 'SCHEDULED';
}

// POST /api/trips — create a new trip from selected orders
router.post('/', authenticate, authorize('ADMIN', 'DISPATCHER'), validateBody(S.createTrip), async (req, res) => {
  try {
    const { truckId, date, orderIds, disposalSiteId } = req.body;
    if (!truckId || !orderIds || orderIds.length === 0) {
      return res.status(400).json({ error: 'Необходими: truckId и orderIds' });
    }

    const orders = await prisma.order.findMany({
      where: { id: { in: orderIds } },
      include: { client: true }
    });

    const trip = await prisma.trip.create({
      data: {
        truckId,
        date: new Date(date || Date.now()),
        status: 'PLANNED',
        disposalSiteId: disposalSiteId || null,
        stops: {
          create: orders.map((o, i) => ({
            orderId: o.id,
            stopType: resolveStopType(o),
            sequence: i + 1,
            lat: o.lat,
            lng: o.lng,
            address: o.address,
            status: 'PENDING',
          }))
        }
      },
      include: {
        truck: { include: { driver: true } },
        stops: { include: { order: { include: { client: true } } }, orderBy: { sequence: 'asc' } }
      }
    });

    // Update order statuses — съобразено с реалния тип на спирката
    for (const o of orders) {
      const newStatus = resolveScheduledStatus(resolveStopType(o));
      await prisma.order.update({ where: { id: o.id }, data: { status: newStatus } }).catch(() => {});
    }

    res.status(201).json(trip);
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Записът не е намерен' });
    if (err.code === 'P2002') return res.status(409).json({ error: 'Вече съществува запис с тази стойност' });
    if (err.code === 'P2003') return res.status(409).json({ error: 'Записът е свързан с други данни' });
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/trips/:id — update trip (reassign truck, date, disposalSite)
router.patch('/:id', authenticate, authorize('ADMIN', 'DISPATCHER'), async (req, res) => {
  try {
    const { truckId, date, disposalSiteId, totalKm } = req.body;
    const data = {};
    if (truckId) data.truckId = truckId;
    if (date) data.date = new Date(date);
    if (disposalSiteId) data.disposalSiteId = disposalSiteId;
    if (totalKm !== undefined) data.totalKm = totalKm;

    const trip = await prisma.trip.update({
      where: { id: req.params.id },
      data,
      include: { truck: { include: { driver: true } }, stops: true, disposalSite: true }
    });
    res.json(trip);
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Записът не е намерен' });
    if (err.code === 'P2002') return res.status(409).json({ error: 'Вече съществува запис с тази стойност' });
    if (err.code === 'P2003') return res.status(409).json({ error: 'Записът е свързан с други данни' });
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/trips/:id/stops/:stopId — remove a stop from a trip
router.delete('/:id/stops/:stopId', authenticate, authorize('ADMIN', 'DISPATCHER'), async (req, res) => {
  try {
    await prisma.tripStop.delete({ where: { id: req.params.stopId } });
    res.json({ deleted: true });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Записът не е намерен' });
    if (err.code === 'P2002') return res.status(409).json({ error: 'Вече съществува запис с тази стойност' });
    if (err.code === 'P2003') return res.status(409).json({ error: 'Записът е свързан с други данни' });
    res.status(500).json({ error: err.message });
  }
});

// Nearest-neighbor VRP reoptimization using Euclidean distance (no extra OSRM calls)
function nearestNeighborOrder(points, hq) {
  const unvisited = [...points];
  const ordered = [];
  let current = hq;
  while (unvisited.length > 0) {
    let bestIdx = 0, bestDist = Infinity;
    for (let i = 0; i < unvisited.length; i++) {
      const d = Math.pow(unvisited[i].lat - current.lat, 2) + Math.pow(unvisited[i].lng - current.lng, 2);
      if (d < bestDist) { bestDist = d; bestIdx = i; }
    }
    ordered.push(unvisited[bestIdx]);
    current = unvisited[bestIdx];
    unvisited.splice(bestIdx, 1);
  }
  return ordered;
}

// GET /api/trips/:id/route — current route + VRP reoptimization + naive comparison
router.get('/:id/route', authenticate, async (req, res) => {
  try {
    const trip = await prisma.trip.findUnique({
      where: { id: req.params.id },
      include: {
        stops: { orderBy: { sequence: 'asc' }, include: { order: { select: { createdAt: true } } } },
        truck: { include: { driver: true } },
        disposalSite: true
      }
    });
    if (!trip) return res.status(404).json({ error: 'Курсът не е намерен' });

    const { getRoute } = require('../services/osrm.service');
    const { getTripRoute } = require('../services/route-cache.service');
    const HQ = { lat: 43.861917, lng: 26.034763 };

    const stopPoints = trip.stops.map(s => ({
      lat: s.lat, lng: s.lng, id: s.id, address: s.address,
      stopType: s.stopType, status: s.status, priority: s.priority || false,
    }));

    if (stopPoints.length === 0) {
      return res.json({ tripId: trip.id, isSingleStop: true, stopCount: 0 });
    }

    // 1. Current sequence (manual or original VRP order from DB)
    const currentPoints = [HQ, ...stopPoints, HQ];
    const current = await getTripRoute(trip.id, currentPoints);

    // 2. VRP nearest-neighbor reoptimization (ignores manual priority, purely geographic)
    const vrpOrdered = nearestNeighborOrder(stopPoints, HQ);
    const vrpPoints = [HQ, ...vrpOrdered, HQ];
    const vrp = await getRoute(vrpPoints);

    // 3. Naive zigzag (maximum geographic backtracking — baseline for savings display)
    const sortedByLng = [...stopPoints].sort((a, b) => b.lng - a.lng);
    const naiveZigzag = [];
    let lo = 0, hi = sortedByLng.length - 1, fromEnd = true;
    while (lo <= hi) {
      naiveZigzag.push(fromEnd ? sortedByLng[hi--] : sortedByLng[lo++]);
      fromEnd = !fromEnd;
    }
    const naive = await getRoute([HQ, ...naiveZigzag, HQ]);

    // Detect if manually reordered
    const hasPriority = stopPoints.some(s => s.priority);
    const currentIdOrder = stopPoints.map(s => s.id).join(',');
    const vrpIdOrder     = vrpOrdered.map(s => s.id).join(',');
    const isManuallyReordered = hasPriority || currentIdOrder !== vrpIdOrder;

    // Fuel cost
    let settings = null;
    try { settings = await prisma.companySettings.findUnique({ where: { id: 'default' } }); } catch {}
    const fuelL100 = trip.truck?.fuelL100 || 28;
    const fuelPriceEur = settings?.fuelPriceDiesel || 1.70;

    // Savings: current vs naive (VRP benefit shown to user)
    const savedKmVsNaive    = Math.max(0, naive.distanceKm - current.distanceKm);
    const savingPercent     = naive.distanceKm > 0 ? Math.round(savedKmVsNaive / naive.distanceKm * 100) : 0;
    const fuelSavedL        = Math.round(savedKmVsNaive * (fuelL100 / 100) * 10) / 10;
    const fuelSavedEur      = Math.round(fuelSavedL * fuelPriceEur * 100) / 100;

    // Manual vs VRP delta (how much worse/better the manual order is vs geographic optimal)
    const manualVsVrpKm     = Math.round((current.distanceKm - vrp.distanceKm) * 10) / 10;
    const manualVsVrpFuelL  = Math.round(Math.abs(manualVsVrpKm) * (fuelL100 / 100) * 10) / 10;
    const manualVsVrpEur    = Math.round(manualVsVrpFuelL * fuelPriceEur * 100) / 100;

    res.json({
      tripId:             trip.id,
      geometry:           current.geometry,   // current route geometry (for map)
      vrpGeometry:        vrp.geometry,        // VRP-optimal geometry (for map overlay)
      // Current route
      currentKm:          Math.round(current.distanceKm * 10) / 10,
      optimizedKm:        Math.round(current.distanceKm * 10) / 10, // alias for backwards compat
      durationMin:        Math.round(current.durationMin),
      // VRP reoptimized
      vrpKm:              Math.round(vrp.distanceKm * 10) / 10,
      // Naive
      naiveKm:            Math.round(naive.distanceKm * 10) / 10,
      // Savings vs naive
      savedKm:            Math.round(savedKmVsNaive * 10) / 10,
      savingPercent,
      fuelSavedL,
      fuelSavedEur,
      fuelPriceEur,
      // Manual vs VRP comparison
      isManuallyReordered,
      manualVsVrpKm,        // positive = manual is WORSE than VRP; negative = manual is BETTER
      manualVsVrpEur,       // absolute EUR difference
      manualVsVrpFuelL,
      vrpStopOrder:       vrpOrdered.map(s => s.id), // ordered stop IDs for "apply VRP" button
      hqReturn:           HQ,
      stopCount:          stopPoints.length,
      isSingleStop:       stopPoints.length <= 1,
    });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Записът не е намерен' });
    if (err.code === 'P2002') return res.status(409).json({ error: 'Вече съществува запис с тази стойност' });
    if (err.code === 'P2003') return res.status(409).json({ error: 'Записът е свързан с други данни' });
    res.status(500).json({ error: err.message });
  }
});

// POST /api/trips/:id/stops — добавяне на заявка към вече създаден курс
router.post('/:id/stops', validateParamId(), authenticate, authorize('ADMIN', 'DISPATCHER'),
  validateBody(S.addStop), async (req, res) => {
  try {
    const { orderId, priority, swap } = req.body;

    const trip = await prisma.trip.findUnique({
      where: { id: req.params.id },
      include: { stops: { orderBy: { sequence: 'desc' }, take: 1 } }
    });
    if (!trip) return res.status(404).json({ error: 'Курсът не е намерен' });
    if (['COMPLETED', 'CANCELLED'].includes(trip.status)) {
      return res.status(400).json({ error: 'Приключен курс не може да се променя' });
    }

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) return res.status(404).json({ error: 'Заявката не е намерена' });

    const already = await prisma.tripStop.findFirst({ where: { tripId: trip.id, orderId } });
    if (already) return res.status(409).json({ error: 'Заявката вече е в този курс' });

    const stopType = resolveStopType(order, { swap });
    const nextSeq = (trip.stops[0]?.sequence || 0) + 1;

    const stop = await prisma.tripStop.create({
      data: {
        tripId: trip.id, orderId, stopType, sequence: nextSeq,
        priority: priority || false,
        lat: order.lat, lng: order.lng, address: order.address, status: 'PENDING',
      },
      include: { order: { include: { client: true } } }
    });

    await prisma.order.update({
      where: { id: orderId },
      data: { status: resolveScheduledStatus(stopType) }
    });

    // спирките се смениха — кешираната геометрия вече не е валидна
    await require('../services/route-cache.service').invalidateTripRoute(trip.id);

    const { io } = require('../index');
    io.emit('trip_updated', { tripId: trip.id });

    res.status(201).json(stop);
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Записът не е намерен' });
    if (err.code === 'P2002') return res.status(409).json({ error: 'Вече съществува запис с тази стойност' });
    if (err.code === 'P2003') return res.status(409).json({ error: 'Записът е свързан с други данни' });
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/trips/:id — отмяна на курс; заявките се връщат в предишното си състояние
router.delete('/:id', validateParamId(), authenticate, authorize('ADMIN', 'DISPATCHER'), async (req, res) => {
  try {
    const trip = await prisma.trip.findUnique({
      where: { id: req.params.id },
      include: { stops: { include: { order: true } } }
    });
    if (!trip) return res.status(404).json({ error: 'Курсът не е намерен' });
    if (trip.status !== 'PLANNED') {
      return res.status(400).json({ error: 'Може да се отменя само курс в статус „Планиран“' });
    }

    // Връщаме всяка заявка там, откъдето е дошла: тези за вземане се
    // връщат в AWAITING_FILL, останалите — в CONFIRMED.
    for (const stop of trip.stops) {
      const back = stop.stopType === 'PICKUP' ? 'AWAITING_FILL' : 'CONFIRMED';
      await prisma.order.update({ where: { id: stop.orderId }, data: { status: back } }).catch(() => {});
    }

    await prisma.tripStop.deleteMany({ where: { tripId: trip.id } });
    await prisma.routeLog.deleteMany({ where: { tripId: trip.id } });
    await prisma.trip.delete({ where: { id: trip.id } });

    const { io } = require('../index');
    io.emit('trip_deleted', { tripId: trip.id });

    res.json({ ok: true, releasedOrders: trip.stops.length });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Записът не е намерен' });
    if (err.code === 'P2002') return res.status(409).json({ error: 'Вече съществува запис с тази стойност' });
    if (err.code === 'P2003') return res.status(409).json({ error: 'Записът е свързан с други данни' });
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
