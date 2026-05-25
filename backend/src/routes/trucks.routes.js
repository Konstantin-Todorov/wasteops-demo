const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorize } = require('../middleware/auth.middleware');

const router = express.Router();
const prisma = new PrismaClient();

router.get('/', authenticate, async (req, res) => {
  try {
    const trucks = await prisma.truck.findMany({
      include: { driver: { select: { id: true, name: true } } }
    });
    res.json(trucks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/my', authenticate, authorize('DRIVER'), async (req, res) => {
  try {
    const truck = await prisma.truck.findFirst({
      where: { driverId: req.user.id },
      include: { driver: { select: { id: true, name: true } } }
    });
    res.json(truck);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/trucks — create new truck
router.post('/', authenticate, authorize('ADMIN', 'DISPATCHER'), async (req, res) => {
  try {
    const {
      plate, model, year, capacityM3, capacityKg, color,
      fuelType, fuelL100, mileageKm,
      gtpDate, civilDate, vignetteDate, vignetteUrl,
      notes, status, driverId
    } = req.body;
    if (!plate) return res.status(400).json({ error: 'Регистрационният номер е задължителен' });

    const truck = await prisma.truck.create({
      data: {
        plate,
        model: model || '',
        year: year ? parseInt(year) : null,
        capacityM3: capacityM3 ? parseFloat(capacityM3) : null,
        capacityKg: capacityKg ? parseInt(capacityKg) : null,
        color: color || '#64748b',
        fuelType: fuelType || 'Дизел',
        fuelL100: fuelL100 ? parseFloat(fuelL100) : null,
        mileageKm: mileageKm ? parseInt(mileageKm) : null,
        gtpDate: gtpDate ? new Date(gtpDate) : null,
        civilDate: civilDate ? new Date(civilDate) : null,
        vignetteDate: vignetteDate ? new Date(vignetteDate) : null,
        vignetteUrl: vignetteUrl || null,
        notes: notes || null,
        status: status || 'AVAILABLE',
        driverId: driverId || null,
      },
      include: { driver: { select: { id: true, name: true } } }
    });
    res.status(201).json(truck);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:id/status', authenticate, authorize('ADMIN', 'DISPATCHER'), async (req, res) => {
  try {
    const truck = await prisma.truck.update({
      where: { id: req.params.id },
      data: { status: req.body.status }
    });
    res.json(truck);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:id', authenticate, authorize('ADMIN', 'DISPATCHER'), async (req, res) => {
  try {
    const {
      plate, model, year, capacityM3, capacityKg, color,
      fuelType, fuelL100, mileageKm,
      gtpDate, civilDate, vignetteDate, vignetteUrl,
      notes, status
    } = req.body;

    const data = {};
    if (plate !== undefined) data.plate = plate;
    if (model !== undefined) data.model = model;
    if (year !== undefined) data.year = year !== null ? parseInt(year) : null;
    if (capacityM3 !== undefined) data.capacityM3 = parseFloat(capacityM3);
    if (capacityKg !== undefined) data.capacityKg = parseInt(capacityKg);
    if (color !== undefined) data.color = color;
    if (fuelType !== undefined) data.fuelType = fuelType;
    if (fuelL100 !== undefined) data.fuelL100 = fuelL100 !== null ? parseFloat(fuelL100) : null;
    if (mileageKm !== undefined) data.mileageKm = mileageKm !== null ? parseInt(mileageKm) : null;
    if (gtpDate !== undefined) data.gtpDate = gtpDate ? new Date(gtpDate) : null;
    if (civilDate !== undefined) data.civilDate = civilDate ? new Date(civilDate) : null;
    if (vignetteDate !== undefined) data.vignetteDate = vignetteDate ? new Date(vignetteDate) : null;
    if (vignetteUrl !== undefined) data.vignetteUrl = vignetteUrl;
    if (notes !== undefined) data.notes = notes;
    if (status !== undefined) data.status = status;

    const truck = await prisma.truck.update({
      where: { id: req.params.id },
      data,
      include: { driver: { select: { id: true, name: true } } }
    });
    res.json(truck);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
