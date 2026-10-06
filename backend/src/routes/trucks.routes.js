const express = require('express');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { validateParamId } = require('../middleware/validate.middleware');
const prisma = require('../lib/prisma');

const router = express.Router();
router.get('/', authenticate, async (req, res) => {
  try {
    const trucks = await prisma.truck.findMany({
      include: { driver: { select: { id: true, name: true } } }
    });
    res.json(trucks);
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Записът не е намерен' });
    if (err.code === 'P2002') return res.status(409).json({ error: 'Вече съществува запис с тази стойност' });
    if (err.code === 'P2003') return res.status(409).json({ error: 'Записът е свързан с други данни' });
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
    if (err.code === 'P2025') return res.status(404).json({ error: 'Записът не е намерен' });
    if (err.code === 'P2002') return res.status(409).json({ error: 'Вече съществува запис с тази стойност' });
    if (err.code === 'P2003') return res.status(409).json({ error: 'Записът е свързан с други данни' });
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
    if (err.code === 'P2025') return res.status(404).json({ error: 'Записът не е намерен' });
    if (err.code === 'P2002') return res.status(409).json({ error: 'Вече съществува запис с тази стойност' });
    if (err.code === 'P2003') return res.status(409).json({ error: 'Записът е свързан с други данни' });
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
    if (err.code === 'P2025') return res.status(404).json({ error: 'Записът не е намерен' });
    if (err.code === 'P2002') return res.status(409).json({ error: 'Вече съществува запис с тази стойност' });
    if (err.code === 'P2003') return res.status(409).json({ error: 'Записът е свързан с други данни' });
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
    if (err.code === 'P2025') return res.status(404).json({ error: 'Записът не е намерен' });
    if (err.code === 'P2002') return res.status(409).json({ error: 'Вече съществува запис с тази стойност' });
    if (err.code === 'P2003') return res.status(409).json({ error: 'Записът е свързан с други данни' });
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/trucks/:id — камион с курсове се маркира в сервиз вместо да се трие
router.delete('/:id', validateParamId(), authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const truck = await prisma.truck.findUnique({
      where: { id: req.params.id },
      include: { trips: { take: 1 }, driver: true }
    });
    if (!truck) return res.status(404).json({ error: 'Камионът не е намерен' });

    const active = await prisma.trip.count({
      where: { truckId: truck.id, status: { in: ['PLANNED', 'IN_PROGRESS', 'AT_DISPOSAL'] } }
    });
    if (active) return res.status(409).json({ error: `Камионът има ${active} активни курса` });

    if (truck.trips.length) {
      await prisma.truck.update({
        where: { id: truck.id }, data: { status: 'MAINTENANCE', driverId: null }
      });
      return res.json({ ok: true, mode: 'retired', message: 'Камионът има история — изведен е от експлоатация' });
    }

    await prisma.truck.delete({ where: { id: truck.id } });
    res.json({ ok: true, mode: 'deleted' });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Записът не е намерен' });
    if (err.code === 'P2002') return res.status(409).json({ error: 'Вече съществува запис с тази стойност' });
    if (err.code === 'P2003') return res.status(409).json({ error: 'Записът е свързан с други данни' });
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
