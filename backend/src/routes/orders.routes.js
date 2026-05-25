const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorize } = require('../middleware/auth.middleware');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/orders/stats - aggregate stats for BI (must be before /:id)
router.get('/stats', authenticate, authorize('ADMIN', 'DISPATCHER', 'ACCOUNTANT'), async (req, res) => {
  try {
    const [byStatus, byType, byWasteType, recentActivity, total] = await Promise.all([
      prisma.order.groupBy({ by: ['status'], _count: { id: true } }),
      prisma.order.groupBy({ by: ['orderType'], _count: { id: true } }),
      prisma.order.groupBy({ by: ['wasteType'], _count: { id: true }, orderBy: { _count: { id: 'desc' } } }),
      prisma.orderEvent.findMany({
        take: 20,
        orderBy: { createdAt: 'desc' },
        include: { order: { include: { client: true } }, user: { select: { id: true, name: true } } }
      }),
      prisma.order.count()
    ]);

    res.json({
      total,
      byStatus: byStatus.map(r => ({ status: r.status, count: r._count.id })),
      byType: byType.map(r => ({ type: r.orderType, count: r._count.id })),
      byWasteType: byWasteType.map(r => ({ wasteType: r.wasteType, count: r._count.id })),
      recentActivity
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/orders - list with filters
router.get('/', authenticate, async (req, res) => {
  try {
    const { role, clientId: userClientId } = req.user;
    const { status, clientId, type } = req.query;

    const where = {};

    // Clients see only their own orders
    if (role === 'CORPORATE_CLIENT' || role === 'INDIVIDUAL_CLIENT') {
      where.clientId = userClientId;
    } else if (clientId) {
      where.clientId = clientId;
    }

    if (status) where.status = status;
    if (type) where.orderType = type;

    const orders = await prisma.order.findMany({
      where,
      include: {
        client: true,
        containerType: true,
        container: true,
        events: { orderBy: { createdAt: 'asc' } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/orders/:id - detail with events, stops
router.get('/:id', authenticate, async (req, res) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: {
        client: true,
        containerType: true,
        container: { include: { containerType: true } },
        events: {
          orderBy: { createdAt: 'asc' },
          include: { user: { select: { id: true, name: true, role: true } } }
        },
        stops: {
          include: { trip: { include: { truck: { include: { driver: { select: { id: true, name: true } } } } } } },
          orderBy: { sequence: 'asc' }
        },
        invoices: true
      }
    });
    if (!order) return res.status(404).json({ error: 'Заявката не е намерена' });

    // Clients can only see their own orders
    const { role, clientId } = req.user;
    if ((role === 'CORPORATE_CLIENT' || role === 'INDIVIDUAL_CLIENT') && order.clientId !== clientId) {
      return res.status(403).json({ error: 'Нямате достъп до тази заявка' });
    }

    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/orders - create
router.post('/', authenticate, async (req, res) => {
  try {
    const { role, clientId: userClientId, id: userId } = req.user;
    const body = { ...req.body };

    // Clients always use their own clientId
    if (role === 'CORPORATE_CLIENT' || role === 'INDIVIDUAL_CLIENT') {
      body.clientId = userClientId;
    }

    const { events, stops, invoices, container, ...orderData } = body;

    const order = await prisma.order.create({
      data: {
        ...orderData,
        status: 'PENDING_ADMIN',
        requestedDate: new Date(orderData.requestedDate || Date.now()),
        events: {
          create: {
            eventType: 'order_created',
            userId,
            notes: 'Заявката е подадена'
          }
        }
      },
      include: { client: true, events: true }
    });
    res.status(201).json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/orders/:id - general update (edit fields)
router.patch('/:id', authenticate, authorize('ADMIN', 'DISPATCHER'), async (req, res) => {
  try {
    const { requestedDate, notes, address, lat, lng, wasteType, volumeM3, estimatedKg, paymentMethod } = req.body;
    const data = {};
    if (requestedDate !== undefined) data.requestedDate = new Date(requestedDate);
    if (notes !== undefined) data.notes = notes;
    if (address !== undefined) data.address = address;
    if (lat !== undefined) data.lat = parseFloat(lat);
    if (lng !== undefined) data.lng = parseFloat(lng);
    if (wasteType !== undefined) data.wasteType = wasteType;
    if (volumeM3 !== undefined) data.volumeM3 = parseFloat(volumeM3);
    if (estimatedKg !== undefined) data.estimatedKg = parseInt(estimatedKg);
    if (paymentMethod !== undefined) data.paymentMethod = paymentMethod;

    const order = await prisma.order.update({
      where: { id: req.params.id },
      data: { ...data, updatedAt: new Date() },
      include: { client: true, events: { orderBy: { createdAt: 'asc' } } }
    });
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/orders/:id/confirm - admin confirms
router.patch('/:id/confirm', authenticate, authorize('ADMIN', 'DISPATCHER'), async (req, res) => {
  try {
    const { id: userId } = req.user;
    const { notes } = req.body;

    const order = await prisma.order.update({
      where: { id: req.params.id },
      data: {
        status: 'CONFIRMED',
        updatedAt: new Date(),
        events: {
          create: { eventType: 'admin_confirmed', userId, notes: notes || 'Заявката е потвърдена от администратор' }
        }
      },
      include: { client: true, events: { orderBy: { createdAt: 'desc' }, take: 3 } }
    });
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/orders/:id/cancel - cancel
router.patch('/:id/cancel', authenticate, authorize('ADMIN', 'DISPATCHER'), async (req, res) => {
  try {
    const { id: userId } = req.user;
    const { notes } = req.body;

    const order = await prisma.order.update({
      where: { id: req.params.id },
      data: {
        status: 'CANCELLED',
        updatedAt: new Date(),
        events: {
          create: { eventType: 'cancelled', userId, notes: notes || 'Заявката е отменена' }
        }
      },
      include: { client: true }
    });
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/orders/:id/container-full - client marks container full
router.patch('/:id/container-full', authenticate, async (req, res) => {
  try {
    const { id: userId } = req.user;
    const { notes, lat, lng } = req.body;

    const existing = await prisma.order.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Заявката не е намерена' });
    if (existing.status !== 'AWAITING_FILL') {
      return res.status(400).json({ error: 'Заявката не е в статус AWAITING_FILL' });
    }

    const order = await prisma.order.update({
      where: { id: req.params.id },
      data: {
        status: 'PICKUP_SCHEDULED',
        updatedAt: new Date(),
        events: {
          create: { eventType: 'container_full', userId, lat, lng, notes: notes || 'Клиентът е сигнализирал - контейнерът е пълен' }
        }
      },
      include: { client: true }
    });
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/orders/:id/verify - admin verifies unloading
router.patch('/:id/verify', authenticate, authorize('ADMIN', 'DISPATCHER'), async (req, res) => {
  try {
    const { id: userId } = req.user;
    const { notes } = req.body;

    const existing = await prisma.order.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Заявката не е намерена' });
    if (existing.status !== 'PENDING_VERIFICATION') {
      return res.status(400).json({ error: 'Заявката не е в статус PENDING_VERIFICATION' });
    }

    const order = await prisma.order.update({
      where: { id: req.params.id },
      data: {
        status: 'COMPLETED',
        updatedAt: new Date(),
        events: {
          create: { eventType: 'admin_verified', userId, notes: notes || 'Разтоварването е верифицирано' }
        }
      },
      include: { client: true }
    });
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
