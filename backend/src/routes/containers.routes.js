const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorize } = require('../middleware/auth.middleware');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/containers/types - list all container types (public, no auth required by frontend)
router.get('/types', async (req, res) => {
  try {
    const types = await prisma.containerType.findMany({ orderBy: { volumeM3: 'asc' } });
    res.json(types);
  } catch (err) {
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
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
