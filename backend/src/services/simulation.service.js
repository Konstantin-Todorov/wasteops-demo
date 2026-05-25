const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const simulations = new Map();

function setupSimulation(io) {
  io.on('connection', (socket) => {
    socket.on('start_simulation', async ({ tripId }) => {
      if (simulations.has(tripId)) return;
      await runSimulation(io, tripId);
    });

    socket.on('stop_simulation', ({ tripId }) => {
      stopSimulation(tripId);
    });

    socket.on('join_trip', ({ tripId }) => {
      socket.join(`trip_${tripId}`);
    });
  });
}

async function runSimulation(io, tripId) {
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: { stops: { orderBy: { sequence: 'asc' } }, truck: true }
  });
  if (!trip || trip.stops.length === 0) return;

  await prisma.trip.update({ where: { id: tripId }, data: { status: 'IN_PROGRESS', startedAt: new Date() } });

  const HQ = { lat: 43.861917, lng: 26.034763 };
  const points = [HQ, ...trip.stops.map(s => ({ lat: s.lat, lng: s.lng, stopId: s.id, orderId: s.orderId, stopType: s.stopType })), HQ];

  let stopIndex = 0;
  let segmentProgress = 0;
  const STEPS_PER_SEGMENT = 30;
  const INTERVAL_MS = 800;

  const interval = setInterval(async () => {
    if (!simulations.has(tripId)) {
      clearInterval(interval);
      return;
    }

    const from = points[stopIndex];
    const to = points[stopIndex + 1];
    if (!to) {
      clearInterval(interval);
      simulations.delete(tripId);
      await prisma.trip.update({ where: { id: tripId }, data: { status: 'COMPLETED', completedAt: new Date() } });
      io.emit('simulation_complete', { tripId });
      return;
    }

    const t = segmentProgress / STEPS_PER_SEGMENT;
    const lat = from.lat + (to.lat - from.lat) * t;
    const lng = from.lng + (to.lng - from.lng) * t;

    io.emit('truck_position', {
      tripId,
      truckId: trip.truckId,
      truckColor: trip.truck.color,
      lat,
      lng,
      stopIndex,
      totalStops: trip.stops.length
    });

    segmentProgress++;

    if (segmentProgress >= STEPS_PER_SEGMENT) {
      segmentProgress = 0;
      stopIndex++;

      if (to.stopId) {
        await prisma.tripStop.update({
          where: { id: to.stopId },
          data: { status: 'COMPLETED', arrivedAt: new Date(), completedAt: new Date() }
        });
        const stop = await prisma.tripStop.findUnique({
          where: { id: to.stopId },
          include: { order: { include: { client: true } } }
        });

        // Update order status based on stop type
        let newOrderStatus = null;
        if (to.stopType === 'DELIVERY') newOrderStatus = 'CONTAINER_DELIVERED';
        else if (to.stopType === 'PICKUP' || to.stopType === 'LOAD') newOrderStatus = 'IN_TRANSIT';

        if (newOrderStatus) {
          await prisma.order.update({ where: { id: stop.orderId }, data: { status: newOrderStatus } });
        }

        io.emit('stop_updated', { tripId, stop });
      }
    }
  }, INTERVAL_MS);

  simulations.set(tripId, interval);
}

function stopSimulation(tripId) {
  const interval = simulations.get(tripId);
  if (interval) {
    clearInterval(interval);
    simulations.delete(tripId);
  }
}

module.exports = { setupSimulation, runSimulation, stopSimulation };
