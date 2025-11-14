const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { getDatabase } = require('../config/database');
const { generateToken } = require('../utils/jwt');

/**
 * Register a new user
 */
async function register(req, res) {
  const { email, password, name } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const db = getDatabase();

  try {
    // Check if user already exists
    const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);

    if (existingUser) {
      return res.status(409).json({ error: 'User with this email already exists' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user
    const userId = uuidv4();
    db.prepare(`
      INSERT INTO users (id, email, password_hash, name, role, email_verified)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(userId, email, passwordHash, name || null, 'user', 0);

    // Generate token
    const user = { id: userId, email, role: 'user' };
    const token = generateToken(user);

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: { id: userId, email, name, role: 'user' }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Failed to register user' });
  }
}

/**
 * Login with email and password
 */
async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const db = getDatabase();

  try {
    // Find user
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

    if (!user || !user.password_hash) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password_hash);

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last login
    db.prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?').run(user.id);

    // Generate token
    const token = generateToken(user);

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
}

/**
 * Get current user profile
 */
function getProfile(req, res) {
  const db = getDatabase();

  try {
    const user = db.prepare('SELECT id, email, name, role, created_at, last_login FROM users WHERE id = ?')
      .get(req.user.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
}

module.exports = {
  register,
  login,
  getProfile
};
