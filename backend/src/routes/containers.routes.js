const express = require('express');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { validateBody, validateParamId } = require('../middleware/validate.middleware');
const S = require('../validation/schemas');
const prisma = require('../lib/prisma');

const router = express.Router();
// GET /api/containers/types - list all container types (public, no auth required by frontend)
router.get('/types', async (req, res) => {
  try {
    const types = await prisma.containerType.findMany({ orderBy: { volumeM3: 'asc' } });
    res.json(types);
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Записът не е намерен' });
    if (err.code === 'P2002') return res.status(409).json({ error: 'Вече съществува запис с тази стойност' });
    if (err.code === 'P2003') return res.status(409).json({ error: 'Записът е свързан с други данни' });
    res.status(500).json({ error: err.message });
  }
});

// GET /api/containers/available — свободни контейнери, по желание от конкретен тип.
// Диспечерът го ползва, за да избере кой контейнер да достави.
router.get('/available', authenticate, authorize('ADMIN', 'DISPATCHER'), async (req, res) => {
  try {
    const { containerTypeId } = req.query;
    const where = { status: 'AVAILABLE', currentOrderId: null };
    if (containerTypeId) where.containerTypeId = containerTypeId;
    const containers = await prisma.container.findMany({
      where, include: { containerType: true }, orderBy: { code: 'asc' }
    });
    res.json(containers);
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Записът не е намерен' });
    if (err.code === 'P2002') return res.status(409).json({ error: 'Вече съществува запис с тази стойност' });
    if (err.code === 'P2003') return res.status(409).json({ error: 'Записът е свързан с други данни' });
    res.status(500).json({ error: err.message });
  }
});

// GET /api/containers/map - all containers with lat/lng for map display
router.get('/map', authenticate, async (req, res) => {
  try {
    const containers = await prisma.container.findMany({
      where: { currentLat: { not: null } },
      include: {
        containerType: true,
        order: { include: { client: true } }
      }
    });
    res.json(containers);
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Записът не е намерен' });
    if (err.code === 'P2002') return res.status(409).json({ error: 'Вече съществува запис с тази стойност' });
    if (err.code === 'P2003') return res.status(409).json({ error: 'Записът е свързан с други данни' });
    res.status(500).json({ error: err.message });
  }
});

// GET /api/containers/qr/:code - lookup by QR code
router.get('/qr/:code', authenticate, async (req, res) => {
  try {
    const container = await prisma.container.findUnique({
      where: { qrCode: req.params.code },
      include: {
        containerType: true,
        order: { include: { client: true } }
      }
    });
    if (!container) return res.status(404).json({ error: 'Контейнерът не е намерен' });
    res.json(container);
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Записът не е намерен' });
    if (err.code === 'P2002') return res.status(409).json({ error: 'Вече съществува запис с тази стойност' });
    if (err.code === 'P2003') return res.status(409).json({ error: 'Записът е свързан с други данни' });
    res.status(500).json({ error: err.message });
  }
});

// GET /api/containers - list with optional status filter
router.get('/', authenticate, async (req, res) => {
  try {
    const { status } = req.query;
    const where = status ? { status } : {};
    const containers = await prisma.container.findMany({
      where,
      include: {
        containerType: true,
        order: { include: { client: { select: { id: true, name: true } } } }
      },
      orderBy: { code: 'asc' }
    });
    res.json(containers);
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Записът не е намерен' });
    if (err.code === 'P2002') return res.status(409).json({ error: 'Вече съществува запис с тази стойност' });
    if (err.code === 'P2003') return res.status(409).json({ error: 'Записът е свързан с други данни' });
    res.status(500).json({ error: err.message });
  }
});

// GET /api/containers/:id - single container
router.get('/:id', authenticate, async (req, res) => {
  try {
    const container = await prisma.container.findUnique({
      where: { id: req.params.id },
      include: {
        containerType: true,
        order: { include: { client: true } }
      }
    });
    if (!container) return res.status(404).json({ error: 'Контейнерът не е намерен' });
    res.json(container);
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Записът не е намерен' });
    if (err.code === 'P2002') return res.status(409).json({ error: 'Вече съществува запис с тази стойност' });
    if (err.code === 'P2003') return res.status(409).json({ error: 'Записът е свързан с други данни' });
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/containers/:id/status - update status
router.patch('/:id/status', authenticate, authorize('ADMIN', 'DISPATCHER', 'DRIVER'), async (req, res) => {
  try {
    const { status, currentLat, currentLng, currentOrderId } = req.body;
    const data = { status };
    if (currentLat !== undefined) data.currentLat = currentLat;
    if (currentLng !== undefined) data.currentLng = currentLng;
    if (currentOrderId !== undefined) data.currentOrderId = currentOrderId;

    const container = await prisma.container.update({
      where: { id: req.params.id },
      data,
      include: { containerType: true }
    });
    res.json(container);
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Записът не е намерен' });
    if (err.code === 'P2002') return res.status(409).json({ error: 'Вече съществува запис с тази стойност' });
    if (err.code === 'P2003') return res.status(409).json({ error: 'Записът е свързан с други данни' });
    res.status(500).json({ error: err.message });
  }
});


// POST /api/containers — регистриране на нов контейнер в парка
router.post('/', authenticate, authorize('ADMIN', 'DISPATCHER'), validateBody(S.createContainer), async (req, res) => {
  try {
    const container = await prisma.container.create({
      data: req.body, include: { containerType: true }
    });
    res.status(201).json(container);
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Контейнер с този код или QR вече съществува' });
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/containers/:id/assign — свързва контейнер със заявка (или го отвързва при null).
// Това е липсващото звено: без него жизненият цикъл на контейнера няма какво да движи.
router.patch('/:id/assign', validateParamId(), authenticate, authorize('ADMIN', 'DISPATCHER'), async (req, res) => {
  try {
    const { orderId } = req.body;

    const container = await prisma.container.findUnique({ where: { id: req.params.id } });
    if (!container) return res.status(404).json({ error: 'Контейнерът не е намерен' });

    if (orderId === null || orderId === undefined) {
      const freed = await prisma.container.update({
        where: { id: container.id },
        data: { currentOrderId: null, status: 'AVAILABLE' },
        include: { containerType: true }
      });
      return res.json(freed);
    }

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) return res.status(404).json({ error: 'Заявката не е намерена' });
    if (order.orderType !== 'CONTAINER') {
      return res.status(400).json({ error: 'Само контейнерна заявка може да получи контейнер' });
    }

    const taken = await prisma.container.findUnique({ where: { currentOrderId: orderId } });
    if (taken && taken.id !== container.id) {
      return res.status(409).json({ error: `Заявката вече има контейнер ${taken.code}` });
    }
    if (container.currentOrderId && container.currentOrderId !== orderId) {
      return res.status(409).json({ error: 'Контейнерът вече е зает по друга заявка' });
    }

    const updated = await prisma.container.update({
      where: { id: container.id },
      data: { currentOrderId: orderId },
      include: { containerType: true, order: { include: { client: true } } }
    });
    res.json(updated);
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Този контейнер вече е зает' });
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
