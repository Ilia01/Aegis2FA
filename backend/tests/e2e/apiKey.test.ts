import request from 'supertest';
import app from '../../src/server';
import { cleanDatabase, createTestUser, disconnectTestDb } from '../helpers/testDb';
import { cleanRedis, disconnectTestRedis } from '../helpers/testRedis';
import { generateTokenPair } from '../../src/utils/jwt';

describe('API Key Endpoints (E2E)', () => {
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

  describe('POST /api/api-keys', () => {
    it('should create API key successfully', async () => {
      const response = await request(app)
        .post('/api/api-keys')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Production App',
          scopes: ['2fa:read', '2fa:write'],
          rateLimit: 5000,
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.apiKey).toMatch(/^pk_live_/);
      expect(response.body.data.name).toBe('Production App');
      expect(response.body.data.scopes).toEqual(['2fa:read', '2fa:write']);
      expect(response.body.data.rateLimit).toBe(5000);
    });

    it('should reject invalid scopes', async () => {
      const response = await request(app)
        .post('/api/api-keys')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Test Key',
          scopes: ['invalid:scope'],
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/api-keys')
        .send({
          name: 'Test Key',
          scopes: ['2fa:read'],
        });

      expect(response.status).toBe(401);
    });

    it('should validate input schema', async () => {
      const response = await request(app)
        .post('/api/api-keys')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: '',
          scopes: [],
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid input');
    });
  });

  describe('GET /api/api-keys', () => {
    it('should list all API keys', async () => {
      // Create two keys
      await request(app)
        .post('/api/api-keys')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Key 1', scopes: ['2fa:read'] });

      await request(app)
        .post('/api/api-keys')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Key 2', scopes: ['2fa:write'] });

      const response = await request(app)
        .get('/api/api-keys')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);

      // Should not return plaintext keys
      expect(response.body.data[0].apiKey).toBeUndefined();
    });

    it('should require authentication', async () => {
      const response = await request(app).get('/api/api-keys');
      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/api-keys/:id', () => {
    it('should get specific API key', async () => {
      const createResponse = await request(app)
        .post('/api/api-keys')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Test Key', scopes: ['2fa:read'] });

      const keyId = createResponse.body.data.id;

      const response = await request(app)
        .get(`/api/api-keys/${keyId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(keyId);
      expect(response.body.data.name).toBe('Test Key');
    });

    it('should return 404 for non-existent key', async () => {
      const response = await request(app)
        .get('/api/api-keys/non-existent-id')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('PATCH /api/api-keys/:id', () => {
    it('should update API key', async () => {
      const createResponse = await request(app)
        .post('/api/api-keys')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Old Name', scopes: ['2fa:read'] });

      const keyId = createResponse.body.data.id;

      const response = await request(app)
        .patch(`/api/api-keys/${keyId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'New Name', rateLimit: 2000 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('New Name');
      expect(response.body.data.rateLimit).toBe(2000);
    });
  });

  describe('POST /api/api-keys/:id/rotate', () => {
    it('should rotate API key', async () => {
      const createResponse = await request(app)
        .post('/api/api-keys')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Test Key', scopes: ['2fa:read'] });

      const keyId = createResponse.body.data.id;
      const oldKey = createResponse.body.data.apiKey;

      const response = await request(app)
        .post(`/api/api-keys/${keyId}/rotate`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.apiKey).toBeDefined();
      expect(response.body.data.apiKey).not.toBe(oldKey);
    });
  });

  describe('POST /api/api-keys/:id/revoke', () => {
    it('should revoke API key', async () => {
      const createResponse = await request(app)
        .post('/api/api-keys')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Test Key', scopes: ['2fa:read'] });

      const keyId = createResponse.body.data.id;

      const response = await request(app)
        .post(`/api/api-keys/${keyId}/revoke`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('DELETE /api/api-keys/:id', () => {
    it('should delete API key', async () => {
      const createResponse = await request(app)
        .post('/api/api-keys')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Test Key', scopes: ['2fa:read'] });

      const keyId = createResponse.body.data.id;

      const response = await request(app)
        .delete(`/api/api-keys/${keyId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify deletion
      const getResponse = await request(app)
        .get(`/api/api-keys/${keyId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(getResponse.status).toBe(404);
    });
  });

  describe('API Key Authentication', () => {
    it('should authenticate with API key', async () => {
      // Create API key
      const createResponse = await request(app)
        .post('/api/api-keys')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Test Key', scopes: ['2fa:read', '2fa:write'] });

      const apiKey = createResponse.body.data.apiKey;

      // Use API key to access protected endpoint
      const response = await request(app)
        .get('/api/2fa/methods')
        .set('X-API-Key', apiKey);

      expect(response.status).toBe(200);
    });

    it('should work with Authorization Bearer header', async () => {
      const createResponse = await request(app)
        .post('/api/api-keys')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Test Key', scopes: ['2fa:read', '2fa:write'] });

      const apiKey = createResponse.body.data.apiKey;

      const response = await request(app)
        .get('/api/2fa/methods')
        .set('Authorization', `Bearer ${apiKey}`);

      expect(response.status).toBe(200);
    });

    it('should reject invalid API key', async () => {
      const response = await request(app)
        .get('/api/2fa/methods')
        .set('X-API-Key', 'pk_live_invalid_key');

      expect(response.status).toBe(401);
    });

    it('should reject inactive API key', async () => {
      const createResponse = await request(app)
        .post('/api/api-keys')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Test Key', scopes: ['2fa:read'] });

      const keyId = createResponse.body.data.id;
      const apiKey = createResponse.body.data.apiKey;

      // Revoke the key
      await request(app)
        .post(`/api/api-keys/${keyId}/revoke`)
        .set('Authorization', `Bearer ${accessToken}`);

      // Try to use revoked key
      const response = await request(app)
        .get('/api/2fa/methods')
        .set('X-API-Key', apiKey);

      expect(response.status).toBe(401);
    });
  });
});
