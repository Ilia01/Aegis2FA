import Redis from 'ioredis';
import { env } from './env';

// Create a separate, dedicated connection for BullMQ
// This ensures no conflicts with the main redis client
const bullmqConnection = new Redis({
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  password: env.REDIS_PASSWORD || undefined,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: null,
});

bullmqConnection.on('error', (error) => {
  console.error('BullMQ Redis connection error:', error);
});

export { bullmqConnection };
