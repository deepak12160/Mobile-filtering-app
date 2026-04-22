import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

let redisClient = null;
let isRedisConnected = false;
let hasLoggedRedisError = false;

const formatRedisError = (err) => {
  if (!err) return 'Unknown Redis error';
  if (typeof err === 'string') return err;
  return err.message || err.code || String(err);
};

const connectRedis = async () => {
  try {
    redisClient = createClient({
      socket: {
        host: process.env.REDIS_HOST || 'localhost',
        port: Number(process.env.REDIS_PORT) || 6379,
        reconnectStrategy: false,
      },
      password: process.env.REDIS_PASSWORD || undefined,
    });

    redisClient.on('error', (err) => {
      isRedisConnected = false;

      if (!hasLoggedRedisError) {
        console.warn('Redis unavailable, caching disabled:', formatRedisError(err));
        hasLoggedRedisError = true;
      }
    });

    redisClient.on('connect', () => {
      console.log('Redis connected successfully');
      isRedisConnected = true;
      hasLoggedRedisError = false;
    });

    await redisClient.connect();
  } catch (err) {
    isRedisConnected = false;

    if (!hasLoggedRedisError) {
      console.warn('Redis unavailable, app will continue without cache:', formatRedisError(err));
      hasLoggedRedisError = true;
    }

    redisClient = null;
  }
};

const getCache = async (key) => {
  if (!isRedisConnected || !redisClient) return null;

  try {
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
};

const setCache = async (key, value, ttl = null) => {
  if (!isRedisConnected || !redisClient) return;

  try {
    const expiry = ttl || parseInt(process.env.REDIS_TTL, 10) || 600;
    await redisClient.setEx(key, expiry, JSON.stringify(value));
  } catch {
    // Cache is optional, so write failures should not break requests.
  }
};

const deleteCache = async (pattern) => {
  if (!isRedisConnected || !redisClient) return;

  try {
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) await redisClient.del(keys);
  } catch {
    // Cache invalidation is best-effort only.
  }
};

export { connectRedis, getCache, setCache, deleteCache };
