import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import { prisma } from './config/database';
import { redis } from './config/redis';
import routes from './routes';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import { apiLimiter } from './middleware/rateLimit.middleware';
import { metricsMiddleware } from './middleware/metrics.middleware';

const app: Application = express();

app.use(helmet());

app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(metricsMiddleware);

app.use('/api', apiLimiter);

app.use('/api', routes);

app.use(notFoundHandler);
app.use(errorHandler);

const startServer = async () => {
  try {
    await prisma.$connect();
    console.log('Database connected successfully');

    await redis.ping();
    console.log('Redis connected successfully');

    const PORT = env.PORT;
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${env.NODE_ENV}`);

      if (env.PUBLIC_API_URL) {
        console.log(`API: ${env.PUBLIC_API_URL}`);
        console.log(`Health: ${env.PUBLIC_API_URL.replace('/api', '/api/health')}`);
      } else {
        console.log(`API: http://localhost:${PORT}/api`);
        console.log(`Health: http://localhost:${PORT}/api/health`);
      }
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

process.on('SIGINT', async () => {
  console.log('\nShutting down...');
  await prisma.$disconnect();
  await redis.quit();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\nShutting down...');
  await prisma.$disconnect();
  await redis.quit();
  process.exit(0);
});

// Only start the server if this file is run directly (not imported for testing)
if (require.main === module) {
  startServer();
}

export default app;