import dotenv from 'dotenv';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { fileURLToPath } from 'url';

import { testConnection } from './config/database.js';
import { connectRedis } from './config/redis.js';
import { errorHandler, notFound } from './middlewares/error.middleware.js';

import authRoutes from './routes/auth.routes.js';
import mobileRoutes from './routes/mobile.routes.js';
import storefrontRoutes from './routes/storefront.routes.js';
import userRoutes from './routes/user.routes.js';

dotenv.config();

const app = express();
const indexFilePath = fileURLToPath(new URL('./public/index.html', import.meta.url));

// ── Security & Utility Middleware ────────────────────────────
app.use(helmet());
app.use(compression());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// CORS
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim()) 
  : [];

app.use(cors({
  origin: (origin, cb) => {
    // Allow if no origin (like mobile apps/curl) or if origin is in whitelist
    // In development, you might also want to allow localhost explicitly
    if (!origin || allowedOrigins.includes(origin) || (process.env.NODE_ENV !== 'production' && origin.includes('localhost'))) {
      return cb(null, true);
    }
    cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

// Body parsing
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

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
app.use('/api/storefront', storefrontRoutes);
app.use('/api/users',   userRoutes);

app.get('/', (req, res) => {
  res.sendFile(indexFilePath);
});

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

    console.error('Server error:', err);
  });
};

start();