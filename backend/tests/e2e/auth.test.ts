import request from 'supertest';
import { createTestApp } from '../helpers/testApp';
import { cleanDatabase, testDb, disconnectTestDb } from '../helpers/testDb';
import { cleanRedis, disconnectTestRedis } from '../helpers/testRedis';

const app = createTestApp();

describe('Auth E2E Tests', () => {
  beforeEach(async () => {
    await cleanDatabase();
    await cleanRedis();
  });

  afterAll(async () => {
    await disconnectTestDb();
    await disconnectTestRedis();
  });

  describe('POST /api/auth/register', () => {
    const validData = {
      email: 'test@example.com',
      username: 'testuser',
      password: 'TestPass123!',
    };

    it('should register new user successfully', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(validData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.user.email).toBe(validData.email);
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.header['set-cookie']).toBeDefined();
    });

    it('should reject duplicate email', async () => {
      await request(app).post('/api/auth/register').send(validData);

      const response = await request(app)
        .post('/api/auth/register')
        .send({ ...validData, username: 'differentuser' })
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Email already registered');
    });

    it('should reject invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ ...validData, email: 'invalid-email' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject weak password', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ ...validData, password: 'weak' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await request(app).post('/api/auth/register').send({
        email: 'login@example.com',
        username: 'loginuser',
        password: 'TestPass123!',
      });
    });

    it('should login with email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          emailOrUsername: 'login@example.com',
          password: 'TestPass123!',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.accessToken).toBeDefined();
    });

    it('should login with username', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          emailOrUsername: 'loginuser',
          password: 'TestPass123!',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.accessToken).toBeDefined();
    });

    it('should reject invalid password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          emailOrUsername: 'login@example.com',
          password: 'WrongPassword123!',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should require 2FA when enabled', async () => {
      const user = await testDb.user.findUnique({
        where: { email: 'login@example.com' },
      });

      await testDb.user.update({
        where: { id: user!.id },
        data: { twoFactorEnabled: true },
      });

      await testDb.twoFactorMethod.create({
        data: {
          userId: user!.id,
          type: 'totp',
          secret: 'test-secret',
          enabled: true,
        },
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          emailOrUsername: 'login@example.com',
          password: 'TestPass123!',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.requiresTwoFactor).toBe(true);
      expect(response.body.data.tempToken).toBeDefined();
      expect(response.body.data.accessToken).toBeUndefined();
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('should refresh access token', async () => {
      const registerResponse = await request(app).post('/api/auth/register').send({
        email: 'refresh@example.com',
        username: 'refreshuser',
        password: 'TestPass123!',
      });

      const cookies = registerResponse.header['set-cookie'];

      const response = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', cookies)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.accessToken).toBeDefined();
    });

    it('should reject invalid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout user', async () => {
      const registerResponse = await request(app).post('/api/auth/register').send({
        email: 'logout@example.com',
        username: 'logoutuser',
        password: 'TestPass123!',
      });

      const cookies = registerResponse.header['set-cookie'];

      const response = await request(app)
        .post('/api/auth/logout')
        .set('Cookie', cookies)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/auth/me', () => {
    it('should get current user', async () => {
      const registerResponse = await request(app).post('/api/auth/register').send({
        email: 'me@example.com',
        username: 'meuser',
        password: 'TestPass123!',
      });

      const accessToken = registerResponse.body.data.accessToken;

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe('me@example.com');
    });

    it('should reject without token', async () => {
      const response = await request(app).get('/api/auth/me').expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/revoke-sessions', () => {
    it('should revoke all sessions', async () => {
      const registerResponse = await request(app).post('/api/auth/register').send({
        email: 'revoke@example.com',
        username: 'revokeuser',
        password: 'TestPass123!',
      });

      const accessToken = registerResponse.body.data.accessToken;

      const response = await request(app)
        .post('/api/auth/revoke-sessions')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });
});
