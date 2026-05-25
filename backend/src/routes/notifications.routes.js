const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorize } = require('../middleware/auth.middleware');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/notifications — aggregate recent events into a notification list
router.get('/', authenticate, authorize('ADMIN', 'DISPATCHER', 'ACCOUNTANT'), async (req, res) => {
  try {
    const [
      pendingOrders,
      activeIssues,
      overdueInvoices,
      recentTrips,
      recentClients,
      recentEvents,
    ] = await Promise.all([
      // New/unassigned orders (PENDING_ADMIN)
      prisma.order.findMany({
        where: { status: 'PENDING_ADMIN' },
        take: 8,
        orderBy: { createdAt: 'desc' },
        include: { client: { select: { name: true } } },
      }),
      // Trip stops with issues
      prisma.tripStop.findMany({
        where: { status: 'ISSUE_REPORTED' },
        take: 6,
        orderBy: { completedAt: 'desc' },
        include: {
          trip: { include: { truck: true } },
          order: { include: { client: { select: { name: true } } } },
        },
      }),
      // Overdue invoices
      prisma.invoice.findMany({
        where: { status: 'OVERDUE' },
        take: 5,
        orderBy: { dueDate: 'asc' },
        include: { client: { select: { name: true } } },
      }),
      // Trips in progress or recently completed
      prisma.trip.findMany({
        where: { status: { in: ['IN_PROGRESS', 'COMPLETED'] } },
        take: 4,
        orderBy: { createdAt: 'desc' },
        include: { truck: true },
      }),
      // New clients (last 7 days)
      prisma.client.findMany({
        where: { createdAt: { gte: new Date(Date.now() - 7 * 86400000) } },
        take: 4,
        orderBy: { createdAt: 'desc' },
      }),
      // Order events (state changes)
      prisma.orderEvent.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          order: { include: { client: { select: { name: true } } } },
          user: { select: { name: true } },
        },
      }),
    ]);

    const notifications = [];

    // Issues — highest priority
    for (const stop of activeIssues) {
      notifications.push({
        id: `issue-${stop.id}`,
        type: 'issue',
        priority: 'high',
        title: 'Проблем на спирка',
        message: `${stop.order?.client?.name || 'Неизвестен клиент'} — ${stop.issueNote || 'Отчетен проблем от шофьора'}`,
        meta: stop.trip?.truck?.plate || '',
        createdAt: stop.completedAt || stop.arrivedAt || new Date(),
        link: '/dispatcher/trips',
      });
    }

    // Overdue invoices
    for (const inv of overdueInvoices) {
      notifications.push({
        id: `inv-${inv.id}`,
        type: 'invoice',
        priority: 'high',
        title: 'Просрочена фактура',
        message: `${inv.client?.name} — ${inv.totalAmount} лв., падеж ${new Date(inv.dueDate).toLocaleDateString('bg-BG')}`,
        meta: `#${inv.invoiceNumber || inv.id.slice(0, 8)}`,
        createdAt: inv.dueDate,
        link: '/dispatcher/invoices',
      });
    }

    // Pending orders
    for (const order of pendingOrders) {
      notifications.push({
        id: `order-pending-${order.id}`,
        type: 'order',
        priority: 'medium',
        title: 'Нова заявка',
        message: `${order.client?.name} — ${order.address}`,
        meta: order.containerType || '',
        createdAt: order.createdAt,
        link: '/dispatcher/orders',
      });
    }

    // In-progress trips
    for (const trip of recentTrips.filter(t => t.status === 'IN_PROGRESS')) {
      notifications.push({
        id: `trip-${trip.id}`,
        type: 'trip',
        priority: 'low',
        title: 'Активен курс',
        message: `${trip.truck?.plate} е в движение`,
        meta: trip.truck?.plate || '',
        createdAt: trip.startedAt || trip.createdAt,
        link: '/dispatcher/trips',
      });
    }

    // Completed trips
    for (const trip of recentTrips.filter(t => t.status === 'COMPLETED')) {
      notifications.push({
        id: `trip-done-${trip.id}`,
        type: 'trip_done',
        priority: 'low',
        title: 'Завършен курс',
        message: `${trip.truck?.plate} приключи маршрута`,
        meta: trip.totalKm ? `${trip.totalKm} км` : '',
        createdAt: trip.completedAt || trip.createdAt,
        link: '/dispatcher/trips',
      });
    }

    // New clients
    for (const client of recentClients) {
      notifications.push({
        id: `client-${client.id}`,
        type: 'client',
        priority: 'low',
        title: 'Нов клиент',
        message: client.name,
        meta: client.type === 'CORPORATE' ? 'Корпоративен' : 'Физическо лице',
        createdAt: client.createdAt,
        link: '/dispatcher/clients',
      });
    }

    // Recent order events
    for (const ev of recentEvents) {
      notifications.push({
        id: `event-${ev.id}`,
        type: 'status_change',
        priority: 'low',
        title: 'Събитие по заявка',
        message: `${ev.order?.client?.name || 'Заявка'} — ${ev.eventType}${ev.notes ? ': ' + ev.notes.slice(0, 40) : ''}`,
        meta: ev.user?.name || '',
        createdAt: ev.createdAt,
        link: '/dispatcher/orders',
      });
    }

    // Sort by date desc, take latest 20
    notifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const result = notifications.slice(0, 20);
    const unreadCount = result.filter(n => n.priority === 'high').length
      + result.filter(n => n.type === 'order').length;

    res.json({ notifications: result, unreadCount: Math.min(unreadCount, 9) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
