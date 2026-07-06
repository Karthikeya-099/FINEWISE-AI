const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'finewise_ai_secret_key_123';

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required. Please log in.' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired session. Please log in again.' });
    }
    req.user = user;
    next();
  });
};

const requireRole = (role) => {
  return (req, res, next) => {
    if (!req.user || req.user.role !== role) {
      return res.status(403).json({ error: `Forbidden: Requires ${role} access rights.` });
    }
    next();
  };
};

module.exports = {
  authenticateToken,
  requireRole,
  JWT_SECRET
};
