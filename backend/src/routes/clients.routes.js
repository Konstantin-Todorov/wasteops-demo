const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorize } = require('../middleware/auth.middleware');

const router = express.Router();
const prisma = new PrismaClient();

router.get('/', authenticate, async (req, res) => {
  try {
    const { role, clientId } = req.user;
    if (role === 'CORPORATE_CLIENT' || role === 'INDIVIDUAL_CLIENT') {
      const client = await prisma.client.findUnique({
        where: { id: clientId },
        include: { _count: { select: { orders: true } } }
      });
      return res.json([client]);
    }
    const clients = await prisma.client.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { orders: true } } }
    });
    res.json(clients);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', authenticate, async (req, res) => {
  try {
    const client = await prisma.client.findUnique({
      where: { id: req.params.id },
      include: { orders: { orderBy: { createdAt: 'desc' }, take: 20 } }
    });
    if (!client) return res.status(404).json({ error: 'Клиентът не е намерен' });
    res.json(client);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', authenticate, authorize('ADMIN', 'DISPATCHER'), async (req, res) => {
  try {
    const {
      type, name, taxId, address, lat, lng,
      contactName, contactPhone, email, notes
    } = req.body;

    const client = await prisma.client.create({
      data: {
        type, name, address,
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        taxId: taxId || null,
        contactName: contactName || null,
        contactPhone: contactPhone || null,
        email: email || null,
        notes: notes || null
      }
    });
    res.status(201).json(client);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:id', authenticate, async (req, res) => {
  try {
    const { role, clientId } = req.user;
    const isClientRole = role === 'CORPORATE_CLIENT' || role === 'INDIVIDUAL_CLIENT';

    if (isClientRole && clientId !== req.params.id) {
      return res.status(403).json({ error: 'Нямате права за тази операция' });
    }
    if (!isClientRole && role !== 'ADMIN' && role !== 'DISPATCHER') {
      return res.status(403).json({ error: 'Нямате права за тази операция' });
    }

    const { type, name, taxId, address, lat, lng, contactName, contactPhone, email, notes } = req.body;

    const data = {};
    if (!isClientRole && type !== undefined) data.type = type;
    if (name !== undefined) data.name = name;
    if (taxId !== undefined) data.taxId = taxId;
    if (address !== undefined) data.address = address;
    if (!isClientRole && lat !== undefined) data.lat = parseFloat(lat);
    if (!isClientRole && lng !== undefined) data.lng = parseFloat(lng);
    if (contactName !== undefined) data.contactName = contactName;
    if (contactPhone !== undefined) data.contactPhone = contactPhone;
    if (email !== undefined) data.email = email;
    if (notes !== undefined) data.notes = notes;

    const client = await prisma.client.update({ where: { id: req.params.id }, data });
    res.json(client);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
