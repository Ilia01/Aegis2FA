import Redis from 'ioredis';

export const testRedis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT) || 6379,
});

export const cleanRedis = async () => {
  const keys = await testRedis.keys('*');
  if (keys.length > 0) {
    await testRedis.del(...keys);
  }
};

export const disconnectTestRedis = async () => {
  await testRedis.quit();
};
