const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorize } = require('../middleware/auth.middleware');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/disposal-sites - list all (active + inactive for management)
router.get('/', authenticate, async (req, res) => {
  try {
    const sites = await prisma.disposalSite.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { trips: true } } }
    });
    res.json(sites);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/disposal-sites/:id - detail
router.get('/:id', authenticate, async (req, res) => {
  try {
    const site = await prisma.disposalSite.findUnique({
      where: { id: req.params.id },
      include: {
        trips: {
          orderBy: { date: 'desc' },
          take: 20,
          include: { truck: { include: { driver: { select: { id: true, name: true } } } } }
        }
      }
    });
    if (!site) return res.status(404).json({ error: 'Депото не е намерено' });
    res.json(site);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/disposal-sites - create new site
router.post('/', authenticate, authorize('ADMIN', 'DISPATCHER'), async (req, res) => {
  try {
    const { name, address, lat, lng, radiusM, wasteTypes, active } = req.body;
    if (!name || lat === undefined || lng === undefined) {
      return res.status(400).json({ error: 'Полетата name, lat и lng са задължителни' });
    }
    const site = await prisma.disposalSite.create({
      data: {
        name,
        address: address || '',
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        radiusM: radiusM ? parseInt(radiusM) : 300,
        wasteTypes: wasteTypes || [],
        active: active !== undefined ? active : true,
      }
    });
    res.status(201).json(site);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/disposal-sites/:id - update site
router.patch('/:id', authenticate, authorize('ADMIN', 'DISPATCHER'), async (req, res) => {
  try {
    const { name, address, lat, lng, radiusM, wasteTypes, active } = req.body;
    const data = {};
    if (name !== undefined) data.name = name;
    if (address !== undefined) data.address = address;
    if (lat !== undefined) data.lat = parseFloat(lat);
    if (lng !== undefined) data.lng = parseFloat(lng);
    if (radiusM !== undefined) data.radiusM = parseInt(radiusM);
    if (wasteTypes !== undefined) data.wasteTypes = wasteTypes;
    if (active !== undefined) data.active = active;

    const site = await prisma.disposalSite.update({
      where: { id: req.params.id },
      data
    });
    res.json(site);
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Депото не е намерено' });
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/disposal-sites/:id - soft delete if trips exist, hard delete otherwise
router.delete('/:id', authenticate, authorize('ADMIN', 'DISPATCHER'), async (req, res) => {
  try {
    const site = await prisma.disposalSite.findUnique({
      where: { id: req.params.id },
      include: { _count: { select: { trips: true } } }
    });
    if (!site) return res.status(404).json({ error: 'Депото не е намерено' });

    if (site._count.trips > 0) {
      // Soft delete — has linked trips
      await prisma.disposalSite.update({
        where: { id: req.params.id },
        data: { active: false }
      });
      return res.json({ deleted: false, deactivated: true, message: 'Депото е деактивирано (има свързани курсове)' });
    }

    await prisma.disposalSite.delete({ where: { id: req.params.id } });
    res.json({ deleted: true, message: 'Депото е изтрито' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
