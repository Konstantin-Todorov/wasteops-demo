require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const { Server } = require('socket.io');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const { runMigrations } = require('./migrate');
const { main: runSeed } = require('../seed/seed');

const authRoutes = require('./routes/auth.routes');
const clientRoutes = require('./routes/clients.routes');
const orderRoutes = require('./routes/orders.routes');
const tripRoutes = require('./routes/trips.routes');
const truckRoutes = require('./routes/trucks.routes');
const containerRoutes = require('./routes/containers.routes');
const invoiceRoutes = require('./routes/invoices.routes');
const vrpRoutes = require('./routes/vrp.routes');
const simulationRoutes = require('./routes/simulation.routes');
const devLoginRoutes = require('./routes/devlogin.routes');
const disposalSitesRoutes = require('./routes/disposal-sites.routes');
const analyticsRoutes = require('./routes/analytics.routes');
const driversAnalytics = require('./routes/analytics.drivers.routes');
const settingsRoutes = require('./routes/settings.routes');
const usersRoutes = require('./routes/users.routes');
const notificationsRoutes = require('./routes/notifications.routes');

const { setupSimulation } = require('./services/simulation.service');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

app.use('/api/auth', authRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/trucks', truckRoutes);
app.use('/api/containers', containerRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/vrp', vrpRoutes);
app.use('/api/simulation', simulationRoutes);
app.use('/api/disposal-sites', disposalSitesRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/analytics', driversAnalytics);
app.use('/api/settings', settingsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/notifications', notificationsRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.use('/dev-login', devLoginRoutes);

const spaPath = path.join(__dirname, '../dist');
if (fs.existsSync(spaPath)) {
  app.use(express.static(spaPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(spaPath, 'index.html'));
  });
}

async function seedIfEmpty(prisma) {
  const count = await prisma.user.count();
  if (count === 0) {
    console.log('[seed] Empty database — running demo seed...');
    await runSeed();
    console.log('[seed] Demo seed complete.');
  }
}

async function seedAdmin(prisma) {
  const email = process.env.OWNER_EMAIL;
  const password = process.env.OWNER_PASSWORD;
  if (!email || !password) return;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return;

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: { email, passwordHash, name: 'Admin', role: 'ADMIN' },
  });
  console.log(`[seed] Admin user created: ${email}`);
}

async function start() {
  await runMigrations();

  const prisma = new PrismaClient();
  await seedIfEmpty(prisma);
  await seedAdmin(prisma);
  await prisma.$disconnect();

  setupSimulation(io);

  const PORT = process.env.PORT || 3001;
  server.listen(PORT, () => {
    console.log(`WasteLogix backend running on port ${PORT}`);
  });
}

start().catch((err) => {
  console.error('Startup error:', err);
  process.exit(1);
});

module.exports = { io };
