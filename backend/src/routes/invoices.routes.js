const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorize } = require('../middleware/auth.middleware');

const router = express.Router();
const prisma = new PrismaClient();

router.get('/', authenticate, async (req, res) => {
  try {
    const { role, clientId } = req.user;
    const where = (role === 'CORPORATE_CLIENT' || role === 'INDIVIDUAL_CLIENT') ? { clientId } : {};
    const invoices = await prisma.invoice.findMany({
      where,
      include: { client: true, order: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(invoices);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', authenticate, async (req, res) => {
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: req.params.id },
      include: { client: true, order: { include: { client: true } } }
    });
    if (!invoice) return res.status(404).json({ error: 'Фактурата не е намерена' });
    res.json(invoice);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', authenticate, authorize('ADMIN', 'ACCOUNTANT', 'DISPATCHER'), async (req, res) => {
  try {
    const invoice = await prisma.invoice.create({ data: req.body, include: { client: true } });
    res.status(201).json(invoice);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/generate/:orderId', authenticate, authorize('ADMIN', 'DISPATCHER', 'ACCOUNTANT'), async (req, res) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.orderId },
      include: { client: true }
    });
    if (!order) return res.status(404).json({ error: 'Поръчката не е намерена' });

    const settings = await prisma.companySettings.upsert({
      where: { id: 'default' },
      update: {},
      create: {
        id: 'default',
        name: '',
        address: '',
        invoicePrefix: 'INV',
        invoiceNextNum: 1,
        fuelPriceDiesel: 3.30,
        fuelPriceGasoline: 3.20
      }
    });

    const invoiceNumber =
      settings.invoicePrefix + '-' + String(settings.invoiceNextNum).padStart(4, '0');

    const amount = order.volumeM3
      ? order.volumeM3 * 50
      : order.estimatedKg
      ? (order.estimatedKg / 1000) * 50
      : 0;

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        clientId: order.clientId,
        orderId: order.id,
        amount,
        status: 'DRAFT'
      },
      include: { client: true, order: true }
    });

    await prisma.companySettings.update({
      where: { id: 'default' },
      data: { invoiceNextNum: { increment: 1 } }
    });

    res.status(201).json(invoice);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:id/pay', authenticate, authorize('ADMIN', 'ACCOUNTANT'), async (req, res) => {
  try {
    const invoice = await prisma.invoice.update({
      where: { id: req.params.id },
      data: { status: 'PAID', paidAt: new Date() }
    });
    res.json(invoice);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:id', authenticate, authorize('ADMIN', 'ACCOUNTANT', 'DISPATCHER'), async (req, res) => {
  try {
    const { notes, dueDate, status, invoiceNumber, items, taxPct } = req.body;

    const data = {};
    if (notes !== undefined) data.notes = notes;
    if (dueDate !== undefined) data.dueDate = dueDate ? new Date(dueDate) : null;
    if (status !== undefined) data.status = status;
    if (invoiceNumber !== undefined) data.invoiceNumber = invoiceNumber;
    if (items !== undefined) data.items = items;
    if (taxPct !== undefined) data.taxPct = parseFloat(taxPct);

    const invoice = await prisma.invoice.update({
      where: { id: req.params.id },
      data,
      include: { client: true, order: true }
    });
    res.json(invoice);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
