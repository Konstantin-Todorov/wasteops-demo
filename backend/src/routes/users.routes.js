const express = require('express');
const bcrypt = require('bcryptjs');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { validateBody, validateParamId } = require('../middleware/validate.middleware');
const S = require('../validation/schemas');
const prisma = require('../lib/prisma');

const router = express.Router();
router.post('/', authenticate, authorize('ADMIN', 'DISPATCHER'), validateBody(S.createUser), async (req, res) => {
  try {
    const { name, email, password, role, phone } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Името, имейлът и паролата са задължителни' });

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(400).json({ error: 'Вече съществува потребител с този имейл' });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name, email, passwordHash, role: role || 'DRIVER', phone: phone || null },
      select: { id: true, name: true, email: true, role: true, phone: true, hourlyRate: true, clientId: true, createdAt: true }
    });
    res.status(201).json(user);
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Записът не е намерен' });
    if (err.code === 'P2002') return res.status(409).json({ error: 'Вече съществува запис с тази стойност' });
    if (err.code === 'P2003') return res.status(409).json({ error: 'Записът е свързан с други данни' });
    res.status(500).json({ error: err.message });
  }
});

router.get('/', authenticate, authorize('ADMIN', 'DISPATCHER'), async (req, res) => {
  try {
    const where = {};
    if (req.query.role) where.role = req.query.role;

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        hourlyRate: true,
        clientId: true,
        createdAt: true
      },
      orderBy: { name: 'asc' }
    });
    res.json(users);
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Записът не е намерен' });
    if (err.code === 'P2002') return res.status(409).json({ error: 'Вече съществува запис с тази стойност' });
    if (err.code === 'P2003') return res.status(409).json({ error: 'Записът е свързан с други данни' });
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:id', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const { hourlyRate, phone, name } = req.body;

    const data = {};
    if (name !== undefined) data.name = name;
    if (phone !== undefined) data.phone = phone;
    if (hourlyRate !== undefined) data.hourlyRate = hourlyRate !== null ? parseFloat(hourlyRate) : null;

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        hourlyRate: true,
        clientId: true,
        createdAt: true
      }
    });
    res.json(user);
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Записът не е намерен' });
    if (err.code === 'P2002') return res.status(409).json({ error: 'Вече съществува запис с тази стойност' });
    if (err.code === 'P2003') return res.status(409).json({ error: 'Записът е свързан с други данни' });
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/users/:id/reset-password — админ задава нова парола
router.patch('/:id/reset-password', validateParamId(), authenticate, authorize('ADMIN'),
  validateBody(S.resetPassword), async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) return res.status(404).json({ error: 'Потребителят не е намерен' });

    const passwordHash = await bcrypt.hash(req.body.password, 10);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
    res.json({ ok: true, message: 'Паролата е сменена' });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Записът не е намерен' });
    if (err.code === 'P2002') return res.status(409).json({ error: 'Вече съществува запис с тази стойност' });
    if (err.code === 'P2003') return res.status(409).json({ error: 'Записът е свързан с други данни' });
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/users/:id — деактивиране на акаунт
router.delete('/:id', validateParamId(), authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ error: 'Не можете да изтриете собствения си акаунт' });
    }
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: { truck: true, orderEvents: { take: 1 } }
    });
    if (!user) return res.status(404).json({ error: 'Потребителят не е намерен' });

    if (user.truck) {
      return res.status(409).json({ error: `Потребителят кара ${user.truck.plate} — първо го отвържете от камиона` });
    }
    // Потребител с история се пази заради одитната следа — само се анонимизира достъпът.
    if (user.orderEvents.length) {
      await prisma.user.update({
        where: { id: user.id },
        data: { email: `deleted-${user.id}@wastelogix.invalid`, passwordHash: 'DISABLED' }
      });
      return res.json({ ok: true, mode: 'disabled', message: 'Акаунтът е деактивиран (има история)' });
    }

    await prisma.user.delete({ where: { id: user.id } });
    res.json({ ok: true, mode: 'deleted' });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Записът не е намерен' });
    if (err.code === 'P2002') return res.status(409).json({ error: 'Вече съществува запис с тази стойност' });
    if (err.code === 'P2003') return res.status(409).json({ error: 'Записът е свързан с други данни' });
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
