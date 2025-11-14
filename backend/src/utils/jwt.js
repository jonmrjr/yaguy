const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'your-256-bit-secret-change-this-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

/**
 * Generate a JWT token for a user
 */
function generateToken(user) {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * Verify a JWT token
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

module.exports = {
  generateToken,
  verifyToken
};
