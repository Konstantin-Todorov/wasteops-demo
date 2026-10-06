const express = require('express');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { validateBody, validateParamId } = require('../middleware/validate.middleware');
const S = require('../validation/schemas');
const prisma = require('../lib/prisma');

const router = express.Router();
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
    if (err.code === 'P2025') return res.status(404).json({ error: 'Записът не е намерен' });
    if (err.code === 'P2002') return res.status(409).json({ error: 'Вече съществува запис с тази стойност' });
    if (err.code === 'P2003') return res.status(409).json({ error: 'Записът е свързан с други данни' });
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
    if (err.code === 'P2025') return res.status(404).json({ error: 'Записът не е намерен' });
    if (err.code === 'P2002') return res.status(409).json({ error: 'Вече съществува запис с тази стойност' });
    if (err.code === 'P2003') return res.status(409).json({ error: 'Записът е свързан с други данни' });
    res.status(500).json({ error: err.message });
  }
});

router.post('/', authenticate, authorize('ADMIN', 'ACCOUNTANT', 'DISPATCHER'), async (req, res) => {
  try {
    const invoice = await prisma.invoice.create({ data: req.body, include: { client: true } });
    res.status(201).json(invoice);
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Записът не е намерен' });
    if (err.code === 'P2002') return res.status(409).json({ error: 'Вече съществува запис с тази стойност' });
    if (err.code === 'P2003') return res.status(409).json({ error: 'Записът е свързан с други данни' });
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

    // Цените идват от CompanySettings, не са хардкоднати.
    // Приоритет: реално тегло (от претегляне) → обем → прогнозно тегло.
    const pricePerM3 = settings.pricePerM3 ?? 50;
    const pricePerTon = settings.pricePerTon ?? 50;

    let amount = 0;
    let items = null;

    if (order.volumeM3) {
      amount = order.volumeM3 * pricePerM3;
      items = [{
        description: `${order.wasteType} — контейнер ${order.volumeM3} м³`,
        qty: order.volumeM3, unit: 'м³', price: pricePerM3
      }];
    } else if (order.estimatedKg) {
      const tons = order.estimatedKg / 1000;
      amount = tons * pricePerTon;
      items = [{
        description: `${order.wasteType} — ${order.estimatedKg} кг`,
        qty: tons, unit: 'тон', price: pricePerTon
      }];
    }

    amount = Math.round(amount * 100) / 100;

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        clientId: order.clientId,
        orderId: order.id,
        amount,
        items,
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
    if (err.code === 'P2025') return res.status(404).json({ error: 'Записът не е намерен' });
    if (err.code === 'P2002') return res.status(409).json({ error: 'Вече съществува запис с тази стойност' });
    if (err.code === 'P2003') return res.status(409).json({ error: 'Записът е свързан с други данни' });
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
    if (err.code === 'P2025') return res.status(404).json({ error: 'Записът не е намерен' });
    if (err.code === 'P2002') return res.status(409).json({ error: 'Вече съществува запис с тази стойност' });
    if (err.code === 'P2003') return res.status(409).json({ error: 'Записът е свързан с други данни' });
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:id', validateParamId(), authenticate, authorize('ADMIN', 'ACCOUNTANT', 'DISPATCHER'), validateBody(S.updateInvoice), async (req, res) => {
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
    if (err.code === 'P2025') return res.status(404).json({ error: 'Записът не е намерен' });
    if (err.code === 'P2002') return res.status(409).json({ error: 'Вече съществува запис с тази стойност' });
    if (err.code === 'P2003') return res.status(409).json({ error: 'Записът е свързан с други данни' });
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/invoices/:id/send — DRAFT → SENT, задава падеж от настройките
router.patch('/:id/send', validateParamId(), authenticate, authorize('ADMIN', 'ACCOUNTANT', 'DISPATCHER'), async (req, res) => {
  try {
    const invoice = await prisma.invoice.findUnique({ where: { id: req.params.id } });
    if (!invoice) return res.status(404).json({ error: 'Фактурата не е намерена' });
    if (invoice.status !== 'DRAFT') {
      return res.status(400).json({ error: 'Само чернова може да бъде изпратена' });
    }

    const dueDate = invoice.dueDate || new Date(Date.now() + 14 * 86400000);
    const sent = await prisma.invoice.update({
      where: { id: invoice.id },
      data: { status: 'SENT', dueDate },
      include: { client: true, order: true }
    });
    res.json(sent);
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Записът не е намерен' });
    if (err.code === 'P2002') return res.status(409).json({ error: 'Вече съществува запис с тази стойност' });
    if (err.code === 'P2003') return res.status(409).json({ error: 'Записът е свързан с други данни' });
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/invoices/:id/cancel — анулиране; платена фактура не се анулира
router.patch('/:id/cancel', validateParamId(), authenticate, authorize('ADMIN', 'ACCOUNTANT'), async (req, res) => {
  try {
    const invoice = await prisma.invoice.findUnique({ where: { id: req.params.id } });
    if (!invoice) return res.status(404).json({ error: 'Фактурата не е намерена' });
    if (invoice.status === 'PAID') {
      return res.status(400).json({ error: 'Платена фактура не може да се анулира' });
    }
    const cancelled = await prisma.invoice.update({
      where: { id: invoice.id }, data: { status: 'CANCELLED' }, include: { client: true }
    });
    res.json(cancelled);
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Записът не е намерен' });
    if (err.code === 'P2002') return res.status(409).json({ error: 'Вече съществува запис с тази стойност' });
    if (err.code === 'P2003') return res.status(409).json({ error: 'Записът е свързан с други данни' });
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
