import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { redis } from '../config/redis';

/**
 * Health Check Controller
 * Provides detailed health status of the service and its dependencies
 */

interface HealthCheck {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  service: string;
  version: string;
  uptime: number;
  checks: {
    database: CheckResult;
    redis: CheckResult;
    memory: MemoryCheck;
  };
}

interface CheckResult {
  status: 'up' | 'down';
  responseTime?: number;
  error?: string;
}

interface MemoryCheck extends CheckResult {
  heapUsed?: number;
  heapTotal?: number;
  external?: number;
  rss?: number;
}

/**
 * GET /health
 * Comprehensive health check endpoint for monitoring and load balancers
 */
export const getHealth = async (_req: Request, res: Response): Promise<void> => {
  const healthCheck: HealthCheck = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: '2FA Authentication Service',
    version: process.env.npm_package_version || '1.0.0',
    uptime: process.uptime(),
    checks: {
      database: { status: 'down' },
      redis: { status: 'down' },
      memory: { status: 'up' },
    },
  };

  try {
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    healthCheck.checks.database = {
      status: 'up',
      responseTime: Date.now() - dbStart,
    };
  } catch (error: any) {
    healthCheck.status = 'unhealthy';
    healthCheck.checks.database = {
      status: 'down',
      error: error.message || 'Database connection failed',
    };
  }

  try {
    const redisStart = Date.now();
    await redis.ping();
    healthCheck.checks.redis = {
      status: 'up',
      responseTime: Date.now() - redisStart,
    };
  } catch (error: any) {
    healthCheck.status = healthCheck.status === 'unhealthy' ? 'unhealthy' : 'degraded';
    healthCheck.checks.redis = {
      status: 'down',
      error: error.message || 'Redis connection failed',
    };
  }

  const memoryUsage = process.memoryUsage();
  const memoryThresholdMB = 500; // Alert if heap exceeds 500MB
  const heapUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);

  healthCheck.checks.memory = {
    status: heapUsedMB < memoryThresholdMB ? 'up' : 'down',
    heapUsed: heapUsedMB,
    heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
    external: Math.round(memoryUsage.external / 1024 / 1024),
    rss: Math.round(memoryUsage.rss / 1024 / 1024),
  };

  const statusCode = healthCheck.status === 'healthy' ? 200 :
                     healthCheck.status === 'degraded' ? 200 : 503;

  res.status(statusCode).json(healthCheck);
};

/**
 * GET /health/live
 * Liveness probe - checks if the service is running (for Kubernetes/Docker)
 */
export const getLiveness = (_req: Request, res: Response): void => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
  });
};

/**
 * GET /health/ready
 * Readiness probe - checks if the service is ready to accept traffic
 */
export const getReadiness = async (_req: Request, res: Response): Promise<void> => {
  try {
    await Promise.all([
      prisma.$queryRaw`SELECT 1`,
      redis.ping(),
    ]);

    res.status(200).json({
      status: 'ready',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(503).json({
      status: 'not_ready',
      error: error.message || 'Service dependencies not ready',
      timestamp: new Date().toISOString(),
    });
  }
};
