require('dotenv').config();
const express    = require('express');
const helmet     = require('helmet');
const cors       = require('cors');
const morgan     = require('morgan');
const compression = require('compression');
const rateLimit  = require('express-rate-limit');

const { testConnection }           = require('./config/database');
const { connectRedis }             = require('./config/redis');
const { errorHandler, notFound }   = require('./middlewares/error.middleware');

const authRoutes   = require('./routes/auth.routes');
const mobileRoutes = require('./routes/mobile.routes');
const userRoutes   = require('./routes/user.routes');

const app = express();

// ── Security & Utility Middleware ────────────────────────────
app.use(helmet());
app.use(compression());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// CORS
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',');
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

// Body parsing
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));

// Global rate limiter
const globalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max:      parseInt(process.env.RATE_LIMIT_MAX)        || 100,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { success: false, message: 'Too many requests, please try again later.' },
});

// Strict limiter for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: 'Too many auth attempts, please try again in 15 minutes.' },
});

app.use('/api', globalLimiter);
app.use('/api/auth', authLimiter);

// ── Health Check ─────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
});

// ── API Routes ───────────────────────────────────────────────
app.use('/api/auth',    authRoutes);
app.use('/api/mobiles', mobileRoutes);
app.use('/api/users',   userRoutes);

// ── Error Handling ───────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ── Bootstrap ────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

const start = async () => {
  await testConnection();
  await connectRedis();
  const server = app.listen(PORT, () => {
    console.log(`\n🚀  Server running on http://localhost:${PORT}`);
    console.log(`📡  Environment : ${process.env.NODE_ENV || 'development'}`);
    console.log(`\n  Endpoints:`);
    console.log(`    POST  /api/auth/signup`);
    console.log(`    POST  /api/auth/login`);
    console.log(`    GET   /api/mobiles?brand=Samsung&min_ram=8`);
    console.log(`    GET   /api/mobiles/compare?ids=1,2,3`);
    console.log(`    GET   /api/mobiles/options`);
    console.log(`    GET   /api/users/wishlist\n`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} is already in use. Stop the other process or change PORT in .env.`);
      process.exit(1);
    }

    console.error('Server failed to start:', err.message);
    process.exit(1);
  });
};

start();

module.exports = app;
