const Redis = require('ioredis');
require('dotenv').config();

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASS || undefined,
  maxRetriesPerRequest: 3,
  retryDelayOnFailover: 100,
  enableReadyCheck: true,
  lazyConnect: true
});

redis.on('connect', () => {
  console.log('✅ Redis conectado correctamente');
});

redis.on('error', (err) => {
  console.error('❌ Error Redis:', err.message);
});

const cache = {
  async get(key) {
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  },
  async set(key, value, expireSeconds = 3600) {
    await redis.set(key, JSON.stringify(value), 'EX', expireSeconds);
  },
  async del(key) {
    await redis.del(key);
  },
  async delPattern(pattern) {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }
};

module.exports = { redis, cache };
