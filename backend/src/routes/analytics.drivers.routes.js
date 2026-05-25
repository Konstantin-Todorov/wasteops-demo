const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorize } = require('../middleware/auth.middleware');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/analytics/drivers — per-driver performance stats
router.get('/drivers', authenticate, authorize('ADMIN', 'DISPATCHER'), async (req, res) => {
  try {
    const drivers = await prisma.user.findMany({
      where: { role: 'DRIVER' },
      include: {
        truck: {
          include: {
            trips: {
              include: {
                stops: true,
                disposalSite: true,
              },
              orderBy: { date: 'desc' }
            }
          }
        }
      }
    });

    const stats = drivers.map(driver => {
      const trips = driver.truck?.trips || [];
      const allStops = trips.flatMap(t => t.stops);
      const completedTrips = trips.filter(t => t.status === 'COMPLETED');
      const totalKm = trips.reduce((s, t) => s + (t.totalKm || 0), 0);
      const completedStops = allStops.filter(s => s.status === 'COMPLETED').length;
      const issueStops = allStops.filter(s => s.status === 'ISSUE_REPORTED').length;
      const lastTrip = trips[0];

      // Trips by month (last 6 months)
      const sixMonthsAgo = new Date(Date.now() - 180 * 86400000);
      const recentTrips = trips.filter(t => new Date(t.date) > sixMonthsAgo);

      return {
        id: driver.id,
        name: driver.name,
        email: driver.email,
        truck: driver.truck ? { plate: driver.truck.plate, model: driver.truck.model, color: driver.truck.color } : null,
        stats: {
          totalTrips: trips.length,
          completedTrips: completedTrips.length,
          totalKm: Math.round(totalKm * 10) / 10,
          completedStops,
          issueStops,
          issueRate: allStops.length > 0 ? Math.round(issueStops / allStops.length * 100) : 0,
          avgKmPerTrip: completedTrips.length > 0 ? Math.round(totalKm / completedTrips.length * 10) / 10 : 0,
          lastTripDate: lastTrip?.date || null,
          lastTripStatus: lastTrip?.status || null,
          recentTripsCount: recentTrips.length,
          recentKm: Math.round(recentTrips.reduce((s, t) => s + (t.totalKm || 0), 0) * 10) / 10,
        },
        recentTrips: trips.slice(0, 5).map(t => ({
          id: t.id,
          date: t.date,
          status: t.status,
          totalKm: t.totalKm,
          stopsCount: t.stops.length,
          completedStops: t.stops.filter(s => s.status === 'COMPLETED').length,
          disposalSite: t.disposalSite?.name,
        }))
      };
    });

    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
