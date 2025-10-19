import { Request, Response, NextFunction } from 'express';

/**
 * Metrics Middleware - Track API Response Times
 *
 * Logs slow operations (>100ms) to help identify performance bottlenecks.
 * Tracks per-endpoint metrics for monitoring and optimization.
 */

interface ResponseMetrics {
  method: string;
  path: string;
  statusCode: number;
  responseTime: number;
  timestamp: Date;
}

// In-memory store for recent metrics (last 100 requests)
const metricsStore: ResponseMetrics[] = [];
const MAX_STORED_METRICS = 100;

// Threshold for logging slow operations (milliseconds)
// Set to 500ms to avoid noise from Argon2 password hashing (100-300ms is normal)
// and database operations under load
const SLOW_OPERATION_THRESHOLD = 500;

export const metricsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const startTime = process.hrtime.bigint();

  // Capture original res.json to intercept response
  const originalJson = res.json.bind(res);

  res.json = (body: any) => {
    const endTime = process.hrtime.bigint();
    const responseTime = Number((endTime - startTime) / 1000000n); // Convert to milliseconds

    // Store metrics
    const metric: ResponseMetrics = {
      method: req.method,
      path: req.route?.path || req.path,
      statusCode: res.statusCode,
      responseTime,
      timestamp: new Date(),
    };

    // Add to metrics store (keep only last 100)
    metricsStore.push(metric);
    if (metricsStore.length > MAX_STORED_METRICS) {
      metricsStore.shift();
    }

    // Log slow operations
    if (responseTime > SLOW_OPERATION_THRESHOLD) {
      console.warn(
        `[Performance] Slow operation detected: ${req.method} ${metric.path} - ${responseTime.toFixed(2)}ms (Status: ${res.statusCode})`
      );
    }

    // Log all requests in development
    if (process.env.NODE_ENV === 'development') {
      const color = responseTime > SLOW_OPERATION_THRESHOLD ? '\x1b[33m' : '\x1b[32m'; // Yellow for slow, green for fast
      const reset = '\x1b[0m';
      console.log(
        `${color}[Metrics]${reset} ${req.method} ${metric.path} - ${responseTime.toFixed(2)}ms (${res.statusCode})`
      );
    }

    return originalJson(body);
  };

  next();
};

/**
 * Get recent metrics (for health endpoint or monitoring)
 */
export const getMetrics = () => {
  if (metricsStore.length === 0) {
    return {
      totalRequests: 0,
      avgResponseTime: 0,
      slowOperations: 0,
      metrics: [],
    };
  }

  const totalRequests = metricsStore.length;
  const avgResponseTime =
    metricsStore.reduce((sum, m) => sum + m.responseTime, 0) / totalRequests;
  const slowOperations = metricsStore.filter(
    (m) => m.responseTime > SLOW_OPERATION_THRESHOLD
  ).length;

  return {
    totalRequests,
    avgResponseTime: Math.round(avgResponseTime * 100) / 100,
    slowOperations,
    slowOperationPercentage: Math.round((slowOperations / totalRequests) * 10000) / 100,
    metrics: metricsStore.slice(-10), // Return last 10 requests
  };
};

/**
 * Get metrics by endpoint
 */
export const getMetricsByEndpoint = () => {
  const grouped = metricsStore.reduce((acc, metric) => {
    const key = `${metric.method} ${metric.path}`;
    if (!acc[key]) {
      acc[key] = {
        count: 0,
        totalTime: 0,
        avgTime: 0,
        slowCount: 0,
      };
    }
    acc[key].count++;
    acc[key].totalTime += metric.responseTime;
    if (metric.responseTime > SLOW_OPERATION_THRESHOLD) {
      acc[key].slowCount++;
    }
    return acc;
  }, {} as Record<string, { count: number; totalTime: number; avgTime: number; slowCount: number }>);

  // Calculate averages
  Object.keys(grouped).forEach((key) => {
    grouped[key].avgTime = Math.round((grouped[key].totalTime / grouped[key].count) * 100) / 100;
  });

  return grouped;
};
