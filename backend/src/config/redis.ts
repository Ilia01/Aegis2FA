import Redis from 'ioredis';
import { env } from './env';

export const redis = new Redis({
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  password: env.REDIS_PASSWORD || undefined,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3,
});

redis.on('connect', () => {
  console.log('Redis connected successfully');
});

redis.on('error', (error) => {
  console.error('Redis connection error:', error);
});

redis.on('reconnecting', () => {
  console.log('Redis reconnecting...');
});

process.on('SIGINT', async () => {
  await redis.quit();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await redis.quit();
  process.exit(0);
});

export const otpUtils = {
  async storeOTP(key: string, code: string, expiryMinutes: number): Promise<void> {
    const data = {
      code,
      attempts: 0,
      createdAt: new Date().toISOString(),
    };
    await redis.setex(key, expiryMinutes * 60, JSON.stringify(data));
  },

  async getOTP(key: string): Promise<{ code: string; attempts: number } | null> {
    const data = await redis.get(key);
    if (!data) return null;
    return JSON.parse(data);
  },

  async incrementAttempts(key: string): Promise<number> {
    const data = await this.getOTP(key);
    if (!data) return 0;

    const updated = { ...data, attempts: data.attempts + 1 };
    const ttl = await redis.ttl(key);
    await redis.setex(key, ttl, JSON.stringify(updated));

    return updated.attempts;
  },

  async deleteOTP(key: string): Promise<void> {
    await redis.del(key);
  },

  async checkRateLimit(key: string, maxAttempts: number, windowSeconds: number): Promise<boolean> {
    const current = await redis.incr(key);
    if (current === 1) {
      await redis.expire(key, windowSeconds);
    }
    return current > maxAttempts;
  },
};
