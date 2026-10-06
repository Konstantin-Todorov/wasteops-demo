const express = require('express');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { runSimulation, stopSimulation } = require('../services/simulation.service');

const router = express.Router();

router.post('/start/:tripId', authenticate, authorize('ADMIN', 'DISPATCHER'), async (req, res) => {
  const { io } = require('../index');
  const result = await runSimulation(io, req.params.tripId);
  if (!result?.started) {
    const msg = {
      'no-stops': 'Курсът няма спирки',
      'already-running': 'Симулацията за този курс вече върви',
      'truck-busy': 'Камионът вече кара друг курс',
    }[result?.reason] || 'Симулацията не можа да стартира';
    return res.status(409).json({ started: false, reason: result?.reason, error: msg });
  }
  res.json(result);
});

router.post('/stop/:tripId', authenticate, authorize('ADMIN', 'DISPATCHER'), (req, res) => {
  stopSimulation(req.params.tripId);
  res.json({ stopped: true });
});

module.exports = router;
