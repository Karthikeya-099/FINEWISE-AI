const jwt = require('jsonwebtoken');

// Fetch JWT_SECRET from environment variables or use a default secure fallback
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';

/**
 * Middleware to authenticate requests using JWT
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Format: Bearer <token>

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // Contains id, username, and role
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired authentication token.' });
  }
};

/**
 * Higher-order middleware to restrict access to specific roles
 * @param {string} role - The role required to access the endpoint ('client' or 'admin')
 */
const requireRole = (role) => {
  return (req, res, next) => {
    if (!req.user || req.user.role !== role) {
      return res.status(403).json({ error: `Access denied. Requires ${role} privileges.` });
    }
    next();
  };
};

module.exports = {
  JWT_SECRET,
  authenticateToken,
  requireRole
};
