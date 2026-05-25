const express = require('express');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { authenticate, authorize } = require('../middleware/auth.middleware');

const router = express.Router();
const prisma = new PrismaClient();

router.post('/', authenticate, authorize('ADMIN', 'DISPATCHER'), async (req, res) => {
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
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
