const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorize } = require('../middleware/auth.middleware');

const router = express.Router();
const prisma = new PrismaClient();

const DEFAULT_SETTINGS = {
  id: 'default',
  name: '',
  taxId: null,
  vatId: null,
  address: '',
  phone: null,
  email: null,
  bankName: null,
  iban: null,
  invoicePrefix: 'INV',
  invoiceNextNum: 1,
  fuelPriceDiesel: 3.30,
  fuelPriceGasoline: 3.20
};

router.get('/', authenticate, async (req, res) => {
  try {
    const settings = await prisma.companySettings.upsert({
      where: { id: 'default' },
      update: {},
      create: { ...DEFAULT_SETTINGS }
    });
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const {
      name, taxId, vatId, address, phone, email,
      bankName, iban, invoicePrefix, invoiceNextNum,
      fuelPriceDiesel, fuelPriceGasoline
    } = req.body;

    const data = {};
    if (name !== undefined) data.name = name;
    if (taxId !== undefined) data.taxId = taxId;
    if (vatId !== undefined) data.vatId = vatId;
    if (address !== undefined) data.address = address;
    if (phone !== undefined) data.phone = phone;
    if (email !== undefined) data.email = email;
    if (bankName !== undefined) data.bankName = bankName;
    if (iban !== undefined) data.iban = iban;
    if (invoicePrefix !== undefined) data.invoicePrefix = invoicePrefix;
    if (invoiceNextNum !== undefined) data.invoiceNextNum = parseInt(invoiceNextNum);
    if (fuelPriceDiesel !== undefined) data.fuelPriceDiesel = parseFloat(fuelPriceDiesel);
    if (fuelPriceGasoline !== undefined) data.fuelPriceGasoline = parseFloat(fuelPriceGasoline);

    const settings = await prisma.companySettings.upsert({
      where: { id: 'default' },
      update: data,
      create: { ...DEFAULT_SETTINGS, ...data }
    });
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
