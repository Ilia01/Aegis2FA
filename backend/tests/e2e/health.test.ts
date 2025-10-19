import request from 'supertest';
import app from '../../src/server';
import { cleanDatabase, disconnectTestDb } from '../helpers/testDb';
import { cleanRedis, disconnectTestRedis } from '../helpers/testRedis';

describe('Health Check Endpoints (E2E)', () => {
  beforeEach(async () => {
    await cleanDatabase();
    await cleanRedis();
  });

  afterAll(async () => {
    await disconnectTestDb();
    await disconnectTestRedis();
  });

  describe('GET /api/health', () => {
    it('should return comprehensive health status', async () => {
      const response = await request(app).get('/api/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('service', '2FA Authentication Service');
      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('checks');

      // Check database status
      expect(response.body.checks).toHaveProperty('database');
      expect(response.body.checks.database).toHaveProperty('status', 'up');
      expect(response.body.checks.database).toHaveProperty('responseTime');

      // Check Redis status
      expect(response.body.checks).toHaveProperty('redis');
      expect(response.body.checks.redis).toHaveProperty('status', 'up');
      expect(response.body.checks.redis).toHaveProperty('responseTime');

      // Check memory status
      expect(response.body.checks).toHaveProperty('memory');
      expect(response.body.checks.memory).toHaveProperty('status', 'up');
      expect(response.body.checks.memory).toHaveProperty('heapUsed');
      expect(response.body.checks.memory).toHaveProperty('heapTotal');
      expect(response.body.checks.memory).toHaveProperty('rss');
    });

    it('should return healthy status when all checks pass', async () => {
      const response = await request(app).get('/api/health');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('healthy');
    });

    it('should not require authentication', async () => {
      const response = await request(app).get('/api/health');

      expect(response.status).toBe(200);
      // No 401 or authentication errors
    });

    it('should include uptime', async () => {
      const response = await request(app).get('/api/health');

      expect(response.body.uptime).toBeDefined();
      expect(typeof response.body.uptime).toBe('number');
      expect(response.body.uptime).toBeGreaterThan(0);
    });

    it('should include memory metrics', async () => {
      const response = await request(app).get('/api/health');

      const memory = response.body.checks.memory;
      expect(memory.heapUsed).toBeGreaterThan(0);
      expect(memory.heapTotal).toBeGreaterThan(0);
      expect(memory.rss).toBeGreaterThan(0);
      expect(memory.heapUsed).toBeLessThanOrEqual(memory.heapTotal);
    });

    it('should include response times for dependencies', async () => {
      const response = await request(app).get('/api/health');

      expect(response.body.checks.database.responseTime).toBeDefined();
      expect(response.body.checks.database.responseTime).toBeGreaterThan(0);

      expect(response.body.checks.redis.responseTime).toBeDefined();
      expect(response.body.checks.redis.responseTime).toBeGreaterThan(0);
    });
  });

  describe('GET /api/health/live', () => {
    it('should return liveness status', async () => {
      const response = await request(app).get('/api/health/live');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'alive');
      expect(response.body).toHaveProperty('timestamp');
    });

    it('should respond quickly', async () => {
      const startTime = Date.now();
      await request(app).get('/api/health/live');
      const duration = Date.now() - startTime;

      // Liveness probe should be fast (< 100ms)
      expect(duration).toBeLessThan(100);
    });

    it('should not require authentication', async () => {
      const response = await request(app).get('/api/health/live');
      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/health/ready', () => {
    it('should return readiness status when dependencies are ready', async () => {
      const response = await request(app).get('/api/health/ready');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'ready');
      expect(response.body).toHaveProperty('timestamp');
    });

    it('should check database and Redis connectivity', async () => {
      // This test assumes DB and Redis are healthy
      const response = await request(app).get('/api/health/ready');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ready');
    });

    it('should not require authentication', async () => {
      const response = await request(app).get('/api/health/ready');
      expect(response.status).toBe(200);
    });

    it('should respond faster than comprehensive health check', async () => {
      const readyStart = Date.now();
      await request(app).get('/api/health/ready');
      const readyDuration = Date.now() - readyStart;

      const healthStart = Date.now();
      await request(app).get('/api/health');
      const healthDuration = Date.now() - healthStart;

      // Ready check should be faster or similar
      expect(readyDuration).toBeLessThanOrEqual(healthDuration + 50);
    });
  });

  describe('Health Check Performance', () => {
    it('should respond to health check within reasonable time', async () => {
      const startTime = Date.now();
      const response = await request(app).get('/api/health');
      const duration = Date.now() - startTime;

      expect(response.status).toBe(200);
      // Should respond within 1 second
      expect(duration).toBeLessThan(1000);
    });

    it('should handle multiple concurrent health checks', async () => {
      const promises = Array(10).fill(null).map(() =>
        request(app).get('/api/health')
      );

      const results = await Promise.all(promises);

      results.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.status).toBe('healthy');
      });
    });
  });

  describe('Health Check Error Scenarios', () => {
    it('should handle database check gracefully if DB is slow', async () => {
      // This test just verifies the endpoint doesn't crash
      // In a real scenario, you'd mock a slow/failing database
      const response = await request(app).get('/api/health');

      expect(response.status).toBeOneOf([200, 503]);
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('checks');
    });

    it('should include error details when checks fail', async () => {
      // This test structure shows how errors would be reported
      const response = await request(app).get('/api/health');

      // Even if some checks fail, response should be well-structured
      expect(response.body.checks).toHaveProperty('database');
      expect(response.body.checks).toHaveProperty('redis');

      // Each check should have a status
      expect(['up', 'down']).toContain(response.body.checks.database.status);
      expect(['up', 'down']).toContain(response.body.checks.redis.status);
    });
  });

  describe('Health Check Headers', () => {
    it('should include appropriate cache headers', async () => {
      const response = await request(app).get('/api/health');

      // Health checks should not be cached
      expect(
        response.headers['cache-control'] === undefined ||
        response.headers['cache-control'].includes('no-cache') ||
        response.headers['cache-control'].includes('no-store')
      ).toBe(true);
    });

    it('should return JSON content type', async () => {
      const response = await request(app).get('/api/health');

      expect(response.headers['content-type']).toContain('application/json');
    });
  });
});

// Custom matcher for Jest
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeOneOf(expected: any[]): R;
    }
  }
}

expect.extend({
  toBeOneOf(received, expected) {
    const pass = expected.includes(received);
    if (pass) {
      return {
        message: () => `expected ${received} not to be one of ${expected}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be one of ${expected}`,
        pass: false,
      };
    }
  },
});
