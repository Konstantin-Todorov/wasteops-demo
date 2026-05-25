const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { optimizeRoutes } = require('../services/vrp.service');

const router = express.Router();
const prisma = new PrismaClient();

const HQ = { lat: 43.861917, lng: 26.034763, name: 'База — Русе' };

router.post('/optimize', authenticate, authorize('ADMIN', 'DISPATCHER'), async (req, res) => {
  try {
    const { date, orderIds } = req.body;

    // Filter: CONFIRMED orders, plus AWAITING_FILL GARBAGE_TRUCK orders
    const orders = await prisma.order.findMany({
      where: orderIds
        ? { id: { in: orderIds } }
        : {
            OR: [
              { status: 'CONFIRMED' },
              { status: 'AWAITING_FILL', orderType: 'GARBAGE_TRUCK' }
            ]
          },
      include: { client: true }
    });

    if (orders.length === 0) {
      return res.status(400).json({ error: 'Няма заявки за оптимизация' });
    }

    const trucks = await prisma.truck.findMany({
      where: { status: { not: 'MAINTENANCE' } },
      include: { driver: true }
    });

    if (trucks.length === 0) {
      return res.status(400).json({ error: 'Няма налични камиони' });
    }

    const stops = orders.map((o, i) => ({
      id: o.id,
      orderId: o.id,
      orderType: o.orderType,
      lat: o.lat,
      lng: o.lng,
      address: o.address,
      clientName: o.client.name,
      estimatedKg: o.estimatedKg || 2000,
      volumeM3: o.volumeM3 || 4,
      pointIndex: i + 1
    }));

    const result = await optimizeRoutes({ hq: HQ, stops, trucks });
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/save', authenticate, authorize('ADMIN', 'DISPATCHER'), async (req, res) => {
  try {
    const { routes, date } = req.body;
    const tripDate = new Date(date || Date.now());

    const created = await Promise.all(routes.map(async (route) => {
      if (!route.stops || route.stops.length === 0) return null;

      return prisma.trip.create({
        data: {
          truckId: route.truck.id,
          date: tripDate,
          totalKm: route.totalKm,
          routeJson: { geometry: route.geometry },
          stops: {
            create: route.stops.map((stop, i) => ({
              orderId: stop.orderId,
              // Determine stop type from order type
              stopType: stop.orderType === 'CONTAINER' ? 'DELIVERY' : 'LOAD',
              sequence: i + 1,
              lat: stop.lat,
              lng: stop.lng,
              address: stop.address
            }))
          }
        },
        include: { stops: true, truck: true }
      });
    }));

    const savedTrips = created.filter(Boolean);

    // Update order statuses appropriately
    for (const route of routes) {
      for (const stop of (route.stops || [])) {
        if (stop.orderType === 'CONTAINER') {
          // Container orders: CONFIRMED → DELIVERY_SCHEDULED
          await prisma.order.update({
            where: { id: stop.orderId, status: 'CONFIRMED' },
            data: { status: 'DELIVERY_SCHEDULED' }
          }).catch(() => {});
        } else {
          // Garbage truck orders: CONFIRMED → SCHEDULED
          await prisma.order.update({
            where: { id: stop.orderId, status: 'CONFIRMED' },
            data: { status: 'SCHEDULED' }
          }).catch(() => {});
        }
      }
    }

    res.status(201).json({ trips: savedTrips });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
