/**
 * Performance Utility - Track and Log Operation Timings
 *
 * Helps identify performance bottlenecks in service layer operations.
 * Use for CPU-intensive or I/O-heavy operations.
 */

// Threshold for logging slow operations (milliseconds)
// Set to 500ms to account for CPU-intensive operations like Argon2 password hashing
// which intentionally takes 100-300ms for security. Operations > 500ms indicate real bottlenecks.
const SLOW_OPERATION_THRESHOLD = 500;

export interface PerformanceLog {
  operation: string;
  duration: number;
  timestamp: Date;
  details?: any;
}

// In-memory store for slow operations
const slowOperations: PerformanceLog[] = [];
const MAX_STORED_SLOW_OPS = 50;

/**
 * Measure and log an async operation's performance
 *
 * @example
 * const result = await measurePerformance('hashPassword', async () => {
 *   return await hashPassword(password);
 * }, { userId: '123' });
 */
export async function measurePerformance<T>(
  operationName: string,
  operation: () => Promise<T>,
  details?: any
): Promise<T> {
  const startTime = process.hrtime.bigint();

  try {
    const result = await operation();
    const endTime = process.hrtime.bigint();
    const duration = Number((endTime - startTime) / 1000000n); // Convert to milliseconds

    logPerformance(operationName, duration, details);

    return result;
  } catch (error) {
    const endTime = process.hrtime.bigint();
    const duration = Number((endTime - startTime) / 1000000n);

    console.error(
      `[Performance] Operation "${operationName}" failed after ${duration.toFixed(2)}ms:`,
      error
    );

    throw error;
  }
}

/**
 * Measure and log a sync operation's performance
 *
 * @example
 * const result = measurePerformanceSync('generateOTP', () => {
 *   return generateOTP(6);
 * });
 */
export function measurePerformanceSync<T>(
  operationName: string,
  operation: () => T,
  details?: any
): T {
  const startTime = process.hrtime.bigint();

  try {
    const result = operation();
    const endTime = process.hrtime.bigint();
    const duration = Number((endTime - startTime) / 1000000n);

    logPerformance(operationName, duration, details);

    return result;
  } catch (error) {
    const endTime = process.hrtime.bigint();
    const duration = Number((endTime - startTime) / 1000000n);

    console.error(
      `[Performance] Operation "${operationName}" failed after ${duration.toFixed(2)}ms:`,
      error
    );

    throw error;
  }
}

/**
 * Log performance metrics
 */
function logPerformance(operationName: string, duration: number, details?: any) {
  const perfLog: PerformanceLog = {
    operation: operationName,
    duration,
    timestamp: new Date(),
    details,
  };

  // Log slow operations
  if (duration > SLOW_OPERATION_THRESHOLD) {
    console.warn(
      `[Performance] Slow operation: ${operationName} took ${duration.toFixed(2)}ms`,
      details ? `(${JSON.stringify(details)})` : ''
    );

    // Store slow operation
    slowOperations.push(perfLog);
    if (slowOperations.length > MAX_STORED_SLOW_OPS) {
      slowOperations.shift();
    }
  }

  // Always log in development
  if (process.env.NODE_ENV === 'development') {
    const color = duration > SLOW_OPERATION_THRESHOLD ? '\x1b[33m' : '\x1b[36m'; // Yellow for slow, cyan for normal
    const reset = '\x1b[0m';
    console.log(`${color}[Perf]${reset} ${operationName}: ${duration.toFixed(2)}ms`);
  }
}

/**
 * Get recent slow operations (for monitoring/debugging)
 */
export function getSlowOperations(): PerformanceLog[] {
  return [...slowOperations];
}

/**
 * Clear slow operations log
 */
export function clearSlowOperations(): void {
  slowOperations.length = 0;
}

/**
 * Create a performance timer for manual timing
 *
 * @example
 * const timer = createTimer();
 * // ... do some work
 * const duration = timer.end('myOperation');
 */
export function createTimer() {
  const startTime = process.hrtime.bigint();

  return {
    end: (operationName: string, details?: any): number => {
      const endTime = process.hrtime.bigint();
      const duration = Number((endTime - startTime) / 1000000n);

      logPerformance(operationName, duration, details);

      return duration;
    },
  };
}

/**
 * Performance statistics
 */
export function getPerformanceStats() {
  if (slowOperations.length === 0) {
    return {
      totalSlowOps: 0,
      avgDuration: 0,
      slowestOperation: null,
      recentSlowOps: [],
    };
  }

  const totalSlowOps = slowOperations.length;
  const avgDuration =
    slowOperations.reduce((sum, op) => sum + op.duration, 0) / totalSlowOps;

  const slowestOperation = slowOperations.reduce((slowest, current) =>
    current.duration > slowest.duration ? current : slowest
  );

  return {
    totalSlowOps,
    avgDuration: Math.round(avgDuration * 100) / 100,
    slowestOperation: {
      operation: slowestOperation.operation,
      duration: Math.round(slowestOperation.duration * 100) / 100,
      timestamp: slowestOperation.timestamp,
    },
    recentSlowOps: slowOperations.slice(-10),
  };
}
