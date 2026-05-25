const express = require('express');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { runSimulation, stopSimulation } = require('../services/simulation.service');

const router = express.Router();

router.post('/start/:tripId', authenticate, authorize('ADMIN', 'DISPATCHER'), async (req, res) => {
  const { io } = require('../index');
  await runSimulation(io, req.params.tripId);
  res.json({ started: true });
});

router.post('/stop/:tripId', authenticate, authorize('ADMIN', 'DISPATCHER'), (req, res) => {
  stopSimulation(req.params.tripId);
  res.json({ stopped: true });
});

module.exports = router;
