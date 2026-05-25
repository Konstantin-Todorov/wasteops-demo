const express = require('express');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

// Dev-only auto-login page — sets localStorage and redirects to app
router.get('/:role', async (req, res) => {
  const roleMap = {
    dispatcher: 'dispatcher@wastelogix.bg',
    admin: 'admin@wastelogix.bg',
    driver: 'driver1@wastelogix.bg',
    driver2: 'driver2@wastelogix.bg',
    driver3: 'driver3@wastelogix.bg',
    corporate: 'corporate@buildco.bg',
    individual: 'ivan@gmail.com'
  };
  const email = roleMap[req.params.role];
  if (!email) return res.status(404).send('Неизвестна роля: ' + req.params.role);

  const user = await prisma.user.findUnique({ where: { email }, include: { client: true } });
  if (!user) return res.status(404).send('Потребителят не е намерен: ' + email);

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name, clientId: user.clientId },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );

  const role = user.role;
  const redirectPath =
    (role === 'ADMIN' || role === 'DISPATCHER') ? '/dispatcher'
    : role === 'DRIVER' ? '/driver'
    : '/client';

  const userJson = JSON.stringify({ id: user.id, name: user.name, email: user.email, role: user.role, client: user.client });
  const tokenEnc = encodeURIComponent(token);
  const userEnc = encodeURIComponent(userJson);
  const redirectEnc = encodeURIComponent(redirectPath);

  const baseUrl = process.env.FRONTEND_URL || `${req.protocol}://${req.get('host')}`;
  res.redirect(`${baseUrl}/dev-login?token=${tokenEnc}&user=${userEnc}&redirect=${redirectEnc}`);
});

module.exports = router;
