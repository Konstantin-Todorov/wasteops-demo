require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
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
const prisma = require('./lib/prisma');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

const isProd = process.env.NODE_ENV === 'production';

// Security headers. CSP остава изключен — фронтендът се сервира от същия
// процес и Leaflet/OSRM теглят ресурси от чужди домейни.
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));

// В production CORS се ограничава до реалния домейн; в разработка е отворен.
const allowedOrigins = (process.env.CORS_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
app.use(cors(isProd && allowedOrigins.length ? { origin: allowedOrigins, credentials: true } : {}));

app.use(express.json({ limit: '2mb' }));

// Логинът е най-атакуваната точка — държим го на строг лимит.
app.use('/api/auth', rateLimit({
  windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false,
  message: { error: 'Твърде много опити за вход. Опитайте след 15 минути.' },
}));
app.use('/api', rateLimit({
  windowMs: 60 * 1000, max: 300, standardHeaders: true, legacyHeaders: false,
  message: { error: 'Твърде много заявки. Опитайте отново след малко.' },
}));

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

app.get('/api/health', async (req, res) => {
  // Маршрутизацията по пътища е критична — ако падне, километрите и следите
  // стават грешни, затова статусът ѝ се вижда тук.
  const { checkOsrm } = require('./services/osrm.service');
  const routing = await checkOsrm().catch(e => ({ ok: false, error: e.message }));
  res.json({ status: 'ok', routing });
});
app.use('/dev-login', devLoginRoutes);

// Непознат API път връща JSON, а не HTML-а на SPA-то — иначе фронтендът
// получава „<!DOCTYPE" вместо грешка и хвърля неясен JSON parse error.
app.use('/api', (req, res) => {
  res.status(404).json({ error: `Няма такъв път: ${req.method} ${req.originalUrl}` });
});

const spaPath = path.join(__dirname, '../dist');
if (fs.existsSync(spaPath)) {
  app.use(express.static(spaPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(spaPath, 'index.html'));
  });
}

// Централен error handler. В production не изнасяме stack trace към клиента.
app.use((err, req, res, next) => {
  console.error(`[error] ${req.method} ${req.originalUrl}`, err);
  if (res.headersSent) return next(err);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    error: isProd && status >= 500 ? 'Вътрешна грешка на сървъра' : (err.message || 'Грешка'),
  });
});

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

    await seedIfEmpty(prisma);
  await seedAdmin(prisma);
  await prisma.$disconnect();

  setupSimulation(io);

  // Driver PWA live GPS relay
  io.on('connection', (socket) => {
    socket.on('driver_position', (data) => {
      // data: { truckId, plate, color, lat, lng, speed, heading }
      // Broadcast to all dispatcher/admin clients
      io.emit('truck_position', data);
    });
  });

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
