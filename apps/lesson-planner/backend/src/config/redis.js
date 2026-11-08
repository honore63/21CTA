// Redis Configuration
// Configure Redis connection for job queue and caching

let redis;
try {
  redis = require('redis');
} catch (e) {
  console.warn('⚠️ [Redis] redis package not found. Running in no-cache mode.');
}

let redisClient = null;

/**
 * Initialize Redis connection
 * @returns {Promise<any|null>} Redis client instance or null
 */
const connectRedis = async () => {
  if (!redis) {
    return null;
  }

  // If running in production and no Redis host/URL is configured, skip connecting to 127.0.0.1
  const hasRedisConfig = Boolean(process.env.REDIS_URL || process.env.REDIS_HOST);
  if (process.env.NODE_ENV === 'production' && !hasRedisConfig) {
    console.log('ℹ️ [Redis] No REDIS_URL or REDIS_HOST set. Skipping Redis connection.');
    return null;
  }

  try {
    const clientOptions = {};
    if (process.env.REDIS_URL) {
      clientOptions.url = process.env.REDIS_URL;
    } else {
      clientOptions.socket = {
        host: process.env.REDIS_HOST || '127.0.0.1',
        port: parseInt(process.env.REDIS_PORT, 10) || 6379,
        connectTimeout: 3000,
        reconnectStrategy: (retries) => {
          if (retries > 3) {
            return false; // Stop reconnecting after 3 attempts
          }
          return Math.min(retries * 100, 1000);
        }
      };
      if (process.env.REDIS_PASSWORD) {
        clientOptions.password = process.env.REDIS_PASSWORD;
      }
    }

    redisClient = redis.createClient(clientOptions);

    redisClient.on('error', (err) => {
      console.warn('⚠️ [Redis Client Error]:', err.message || err);
    });

    redisClient.on('connect', () => {
      console.log('✅ Redis client connected');
    });

    redisClient.on('ready', () => {
      console.log('✅ Redis client ready');
    });

    await redisClient.connect();
    return redisClient;
  } catch (error) {
    console.warn('⚠️ Failed to connect to Redis:', error.message || error);
    redisClient = null;
    return null;
  }
};

/**
 * Get Redis client instance
 * @returns {RedisClientType|null} Redis client or null if not connected
 */
const getRedisClient = () => {
  return redisClient;
};

/**
 * Disconnect Redis client
 */
const disconnectRedis = async () => {
  if (redisClient && redisClient.isOpen) {
    await redisClient.quit();
    console.log('Redis client disconnected');
  }
};

module.exports = {
  connectRedis,
  getRedisClient,
  disconnectRedis
};