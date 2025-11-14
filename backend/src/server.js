const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const questionRoutes = require('./routes/questions');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:8000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // 5 attempts per 15 minutes for auth endpoints
  message: 'Too many authentication attempts, please try again later.'
});

app.use('/api/', limiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/questions', questionRoutes);

// Stripe webhook endpoint (raw body needed for signature verification)
app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), (req, res) => {
  const signature = req.headers['stripe-signature'];
  // TODO: Implement webhook handler
  console.log('Stripe webhook received');
  res.json({ received: true });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════╗
║   Ask YaGuy Backend Server Running   ║
╚═══════════════════════════════════════╝

🚀 Server: http://localhost:${PORT}
📝 Health: http://localhost:${PORT}/health
🔐 Auth API: http://localhost:${PORT}/api/auth
❓ Questions API: http://localhost:${PORT}/api/questions
🌐 Frontend: ${process.env.FRONTEND_URL || 'http://localhost:8000'}

Environment: ${process.env.NODE_ENV || 'development'}

Default Admin Credentials:
  Email: admin@yaguy.com
  Password: admin123

Test User Credentials:
  Email: user@example.com
  Password: user123
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  const { closeDatabase } = require('./config/database');
  closeDatabase();
  process.exit(0);
});

module.exports = app;
