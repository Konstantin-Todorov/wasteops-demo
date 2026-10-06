const express = require('express');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { validateBody, validateParamId } = require('../middleware/validate.middleware');
const S = require('../validation/schemas');
const prisma = require('../lib/prisma');

const router = express.Router();
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
    if (err.code === 'P2025') return res.status(404).json({ error: 'Записът не е намерен' });
    if (err.code === 'P2002') return res.status(409).json({ error: 'Вече съществува запис с тази стойност' });
    if (err.code === 'P2003') return res.status(409).json({ error: 'Записът е свързан с други данни' });
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
    if (err.code === 'P2025') return res.status(404).json({ error: 'Записът не е намерен' });
    if (err.code === 'P2002') return res.status(409).json({ error: 'Вече съществува запис с тази стойност' });
    if (err.code === 'P2003') return res.status(409).json({ error: 'Записът е свързан с други данни' });
    res.status(500).json({ error: err.message });
  }
});

router.post('/', authenticate, authorize('ADMIN', 'DISPATCHER'), validateBody(S.createClient), async (req, res) => {
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
    if (err.code === 'P2025') return res.status(404).json({ error: 'Записът не е намерен' });
    if (err.code === 'P2002') return res.status(409).json({ error: 'Вече съществува запис с тази стойност' });
    if (err.code === 'P2003') return res.status(409).json({ error: 'Записът е свързан с други данни' });
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
    if (err.code === 'P2025') return res.status(404).json({ error: 'Записът не е намерен' });
    if (err.code === 'P2002') return res.status(409).json({ error: 'Вече съществува запис с тази стойност' });
    if (err.code === 'P2003') return res.status(409).json({ error: 'Записът е свързан с други данни' });
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/clients/:id — клиент с история не се трие, за да не се чупят фактурите
router.delete('/:id', validateParamId(), authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const client = await prisma.client.findUnique({
      where: { id: req.params.id },
      include: { orders: { take: 1 }, invoices: { take: 1 }, users: { take: 1 } }
    });
    if (!client) return res.status(404).json({ error: 'Клиентът не е намерен' });

    if (client.orders.length || client.invoices.length) {
      return res.status(409).json({
        error: 'Клиентът има заявки или фактури и не може да бъде изтрит. Използвайте архивиране.'
      });
    }
    if (client.users.length) {
      return res.status(409).json({ error: 'Първо изтрийте свързаните потребителски акаунти' });
    }

    await prisma.client.delete({ where: { id: client.id } });
    res.json({ ok: true });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Записът не е намерен' });
    if (err.code === 'P2002') return res.status(409).json({ error: 'Вече съществува запис с тази стойност' });
    if (err.code === 'P2003') return res.status(409).json({ error: 'Записът е свързан с други данни' });
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
