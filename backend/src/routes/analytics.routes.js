const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorize } = require('../middleware/auth.middleware');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/analytics/dashboard
router.get('/dashboard', authenticate, authorize('ADMIN', 'DISPATCHER', 'ACCOUNTANT'), async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    const IN_PROGRESS_STATUSES = [
      'CONFIRMED', 'DELIVERY_SCHEDULED', 'CONTAINER_DELIVERED',
      'AWAITING_FILL', 'PICKUP_SCHEDULED', 'SCHEDULED', 'IN_TRANSIT', 'AT_DISPOSAL', 'PENDING_VERIFICATION'
    ];

    const [
      ordersThisMonthCount,
      ordersLastMonthCount,
      completedThisMonth,
      pendingAdmin,
      inProgress,
      byType,
      byStatus,
      byWasteType,
      truckUtilization,
      recentOrders,
      tripStats
    ] = await Promise.all([
      prisma.order.count({ where: { createdAt: { gte: startOfMonth } } }),
      prisma.order.count({ where: { createdAt: { gte: startOfLastMonth, lte: endOfLastMonth } } }),
      prisma.order.count({ where: { status: 'COMPLETED', updatedAt: { gte: startOfMonth } } }),
      prisma.order.count({ where: { status: 'PENDING_ADMIN' } }),
      prisma.order.count({ where: { status: { in: IN_PROGRESS_STATUSES } } }),
      prisma.order.groupBy({ by: ['orderType'], _count: { id: true } }),
      prisma.order.groupBy({ by: ['status'], _count: { id: true }, orderBy: { _count: { id: 'desc' } } }),
      prisma.order.groupBy({ by: ['wasteType'], _count: { id: true }, orderBy: { _count: { id: 'desc' } } }),
      prisma.truck.findMany({
        include: {
          driver: { select: { id: true, name: true } },
          trips: { select: { id: true, totalKm: true, status: true } }
        }
      }),
      prisma.order.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { client: { select: { id: true, name: true, type: true } } }
      }),
      prisma.trip.aggregate({ _sum: { totalKm: true }, _count: { id: true } })
    ]);

    // Weekly trend — last 7 days
    const weeklyTrend = [];
    for (let i = 6; i >= 0; i--) {
      const day = new Date(now);
      day.setDate(day.getDate() - i);
      day.setHours(0, 0, 0, 0);
      const nextDay = new Date(day);
      nextDay.setDate(nextDay.getDate() + 1);

      const [orders, completed] = await Promise.all([
        prisma.order.count({ where: { createdAt: { gte: day, lt: nextDay } } }),
        prisma.order.count({ where: { status: 'COMPLETED', updatedAt: { gte: day, lt: nextDay } } })
      ]);

      weeklyTrend.push({
        date: day.toISOString().slice(0, 10),
        orders,
        completed
      });
    }

    const totalKmSaved = tripStats._sum.totalKm || 0;
    // Estimate savings vs random routing — assume 22% saving from VRP optimization
    const fuelSavedPct = 22;

    const byTypeMap = {};
    byType.forEach(r => { byTypeMap[r.orderType] = r._count.id; });

    res.json({
      ordersThisMonth: ordersThisMonthCount,
      ordersLastMonth: ordersLastMonthCount,
      completedThisMonth,
      pendingAdmin,
      inProgress,
      byType: {
        CONTAINER: byTypeMap['CONTAINER'] || 0,
        GARBAGE_TRUCK: byTypeMap['GARBAGE_TRUCK'] || 0
      },
      byStatus: byStatus.map(r => ({ status: r.status, count: r._count.id })),
      byWasteType: byWasteType.map(r => ({ wasteType: r.wasteType, count: r._count.id })),
      truckUtilization: truckUtilization.map(t => ({
        truck: { id: t.id, plate: t.plate, model: t.model, color: t.color, driver: t.driver },
        tripsCount: t.trips.length,
        totalKm: t.trips.reduce((s, tr) => s + (tr.totalKm || 0), 0)
      })),
      recentOrders,
      weeklyTrend,
      kmSavedTotal: Math.round(totalKmSaved * 0.22 * 10) / 10,
      fuelSavedPct
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
