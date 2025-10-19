import request from 'supertest';
import app from '../../src/server';
import { cleanDatabase, createTestUser, disconnectTestDb } from '../helpers/testDb';
import { cleanRedis, disconnectTestRedis } from '../helpers/testRedis';
import { generateTokenPair } from '../../src/utils/jwt';
import { WebhookService } from '../../src/services/webhook.service';

describe('Webhook Endpoints (E2E)', () => {
  let accessToken: string;

  beforeEach(async () => {
    await cleanDatabase();
    await cleanRedis();

    const user = await createTestUser();

    const tokens = generateTokenPair(user.id, user.email, user.username);
    accessToken = tokens.accessToken;
  });

  afterAll(async () => {
    await disconnectTestDb();
    await disconnectTestRedis();
  });

  describe('GET /api/webhooks/events', () => {
    it('should list supported events (public endpoint)', async () => {
      const response = await request(app).get('/api/webhooks/events');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.events).toEqual(WebhookService.SUPPORTED_EVENTS);
      expect(response.body.data.descriptions).toBeDefined();
    });
  });

  describe('POST /api/webhooks', () => {
    it('should create webhook successfully', async () => {
      const response = await request(app)
        .post('/api/webhooks')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          url: 'https://example.com/webhooks',
          events: ['2fa.enabled', '2fa.verified'],
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.url).toBe('https://example.com/webhooks');
      expect(response.body.data.events).toEqual(['2fa.enabled', '2fa.verified']);
      expect(response.body.data.secret).toBeDefined();
      expect(response.body.data.secret).toHaveLength(64);
    });

    it('should reject invalid events', async () => {
      const response = await request(app)
        .post('/api/webhooks')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          url: 'https://example.com/webhooks',
          events: ['invalid.event'],
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject invalid URL', async () => {
      const response = await request(app)
        .post('/api/webhooks')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          url: 'not-a-url',
          events: ['2fa.enabled'],
        });

      expect(response.status).toBe(500); // Service throws error
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/webhooks')
        .send({
          url: 'https://example.com/webhooks',
          events: ['2fa.enabled'],
        });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/webhooks', () => {
    it('should list all webhooks', async () => {
      // Create two webhooks
      await request(app)
        .post('/api/webhooks')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          url: 'https://example.com/webhook1',
          events: ['2fa.enabled'],
        });

      await request(app)
        .post('/api/webhooks')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          url: 'https://example.com/webhook2',
          events: ['2fa.verified'],
        });

      const response = await request(app)
        .get('/api/webhooks')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);

      // Should not return secrets
      expect(response.body.data[0].secret).toBeUndefined();
    });

    it('should require authentication', async () => {
      const response = await request(app).get('/api/webhooks');
      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/webhooks/:id', () => {
    it('should get specific webhook', async () => {
      const createResponse = await request(app)
        .post('/api/webhooks')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          url: 'https://example.com/webhooks',
          events: ['2fa.enabled'],
        });

      const webhookId = createResponse.body.data.id;

      const response = await request(app)
        .get(`/api/webhooks/${webhookId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(webhookId);
    });

    it('should return 404 for non-existent webhook', async () => {
      const response = await request(app)
        .get('/api/webhooks/non-existent-id')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('PATCH /api/webhooks/:id', () => {
    it('should update webhook', async () => {
      const createResponse = await request(app)
        .post('/api/webhooks')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          url: 'https://example.com/old',
          events: ['2fa.enabled'],
        });

      const webhookId = createResponse.body.data.id;

      const response = await request(app)
        .patch(`/api/webhooks/${webhookId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          url: 'https://example.com/new',
          events: ['2fa.enabled', '2fa.verified'],
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.url).toBe('https://example.com/new');
      expect(response.body.data.events).toEqual(['2fa.enabled', '2fa.verified']);
    });

    it('should reject invalid events', async () => {
      const createResponse = await request(app)
        .post('/api/webhooks')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          url: 'https://example.com/webhooks',
          events: ['2fa.enabled'],
        });

      const webhookId = createResponse.body.data.id;

      const response = await request(app)
        .patch(`/api/webhooks/${webhookId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          events: ['invalid.event'],
        });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/webhooks/:id/test', () => {
    it('should test webhook delivery', async () => {
      const createResponse = await request(app)
        .post('/api/webhooks')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          url: 'https://example.com/webhooks',
          events: ['2fa.enabled'],
        });

      const webhookId = createResponse.body.data.id;

      const response = await request(app)
        .post(`/api/webhooks/${webhookId}/test`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('queued');
    });

    it('should return 404 for non-existent webhook', async () => {
      const response = await request(app)
        .post('/api/webhooks/non-existent-id/test')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/webhooks/:id', () => {
    it('should delete webhook', async () => {
      const createResponse = await request(app)
        .post('/api/webhooks')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          url: 'https://example.com/webhooks',
          events: ['2fa.enabled'],
        });

      const webhookId = createResponse.body.data.id;

      const response = await request(app)
        .delete(`/api/webhooks/${webhookId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify deletion
      const getResponse = await request(app)
        .get(`/api/webhooks/${webhookId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(getResponse.status).toBe(404);
    });
  });

  describe('Webhook Signature Verification', () => {
    it('should create valid signature', () => {
      const payload = JSON.stringify({
        event: '2fa.enabled',
        data: { userId: 'test-user', method: 'totp' },
        timestamp: new Date().toISOString(),
      });

      const secret = 'test-secret';
      const signature = WebhookService.createSignature(payload, secret);

      expect(signature).toBeDefined();
      expect(typeof signature).toBe('string');

      // Verify signature
      const isValid = WebhookService.verifySignature(payload, signature, secret);
      expect(isValid).toBe(true);
    });

    it('should reject tampered payload', () => {
      const originalPayload = JSON.stringify({
        event: '2fa.enabled',
        data: { userId: 'test-user' },
      });

      const secret = 'test-secret';
      const signature = WebhookService.createSignature(originalPayload, secret);

      // Tamper with payload
      const tamperedPayload = JSON.stringify({
        event: '2fa.enabled',
        data: { userId: 'different-user' },
      });

      const isValid = WebhookService.verifySignature(tamperedPayload, signature, secret);
      expect(isValid).toBe(false);
    });
  });
});
