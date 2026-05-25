const jwt = require('jsonwebtoken');

const VALID_ROLES = new Set([
  'ADMIN', 'DISPATCHER', 'DRIVER', 'ACCOUNTANT', 'CORPORATE_CLIENT', 'INDIVIDUAL_CLIENT'
]);

function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Липсва токен' });
  }
  const token = header.slice(7);
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Невалиден токен' });
  }
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Нямате права за тази операция' });
    }
    next();
  };
}

module.exports = { authenticate, authorize, VALID_ROLES };
