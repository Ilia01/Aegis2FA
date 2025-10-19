import request from 'supertest';
import speakeasy from 'speakeasy';
import { createTestApp } from '../helpers/testApp';
import { cleanDatabase, testDb, disconnectTestDb } from '../helpers/testDb';
import { cleanRedis, disconnectTestRedis } from '../helpers/testRedis';

const app = createTestApp();

describe('2FA E2E Tests', () => {
  let accessToken: string;
  let userId: string;

  beforeEach(async () => {
    await cleanDatabase();
    await cleanRedis();

    const response = await request(app).post('/api/auth/register').send({
      email: 'test2fa@example.com',
      username: 'test2fauser',
      password: 'TestPass123!',
    });

    accessToken = response.body.data.accessToken;
    userId = response.body.data.user.id;
  });

  afterAll(async () => {
    await disconnectTestDb();
    await disconnectTestRedis();
  });

  describe('TOTP', () => {
    describe('POST /api/2fa/totp/setup', () => {
      it('should setup TOTP', async () => {
        const response = await request(app)
          .post('/api/2fa/totp/setup')
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.secret).toBeDefined();
        expect(response.body.data.qrCode).toBeDefined();
        expect(response.body.data.backupCodes).toHaveLength(10);
      });

      it('should reject without auth', async () => {
        await request(app).post('/api/2fa/totp/setup').expect(401);
      });
    });

    describe('POST /api/2fa/totp/verify-setup', () => {
      it('should verify and enable TOTP', async () => {
        const setupResponse = await request(app)
          .post('/api/2fa/totp/setup')
          .set('Authorization', `Bearer ${accessToken}`);

        const secret = setupResponse.body.data.secret;
        const code = speakeasy.totp({ secret, encoding: 'base32' });

        const response = await request(app)
          .post('/api/2fa/totp/verify-setup')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ secret, code })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.backupCodes).toHaveLength(10);

        const user = await testDb.user.findUnique({ where: { id: userId } });
        expect(user?.twoFactorEnabled).toBe(true);
      });

      it('should reject invalid code', async () => {
        const setupResponse = await request(app)
          .post('/api/2fa/totp/setup')
          .set('Authorization', `Bearer ${accessToken}`);

        const secret = setupResponse.body.data.secret;

        const response = await request(app)
          .post('/api/2fa/totp/verify-setup')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ secret, code: '000000' })
          .expect(400);

        expect(response.body.success).toBe(false);
      });
    });
  });

  describe('2FA Verification', () => {
    it('should verify TOTP during login', async () => {
      const setupResponse = await request(app)
        .post('/api/2fa/totp/setup')
        .set('Authorization', `Bearer ${accessToken}`);

      const secret = setupResponse.body.data.secret;
      const code = speakeasy.totp({ secret, encoding: 'base32' });

      await request(app)
        .post('/api/2fa/totp/verify-setup')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ secret, code });

      const loginResponse = await request(app).post('/api/auth/login').send({
        emailOrUsername: 'test2fa@example.com',
        password: 'TestPass123!',
      });

      expect(loginResponse.body.data.requiresTwoFactor).toBe(true);
      const tempToken = loginResponse.body.data.tempToken;

      const newCode = speakeasy.totp({ secret, encoding: 'base32' });

      const verifyResponse = await request(app)
        .post('/api/2fa/verify')
        .send({
          tempToken,
          code: newCode,
          trustDevice: false,
        })
        .expect(200);

      expect(verifyResponse.body.success).toBe(true);
      expect(verifyResponse.body.data.accessToken).toBeDefined();
    });

    it('should trust device when requested', async () => {
      const setupResponse = await request(app)
        .post('/api/2fa/totp/setup')
        .set('Authorization', `Bearer ${accessToken}`);

      const secret = setupResponse.body.data.secret;
      const code = speakeasy.totp({ secret, encoding: 'base32' });

      await request(app)
        .post('/api/2fa/totp/verify-setup')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ secret, code });

      const loginResponse = await request(app).post('/api/auth/login').send({
        emailOrUsername: 'test2fa@example.com',
        password: 'TestPass123!',
      });

      const tempToken = loginResponse.body.data.tempToken;
      const newCode = speakeasy.totp({ secret, encoding: 'base32' });

      const verifyResponse = await request(app)
        .post('/api/2fa/verify')
        .send({
          tempToken,
          code: newCode,
          trustDevice: true,
          deviceName: 'Test Device',
        })
        .expect(200);

      expect(verifyResponse.body.data.deviceToken).toBeDefined();

      const devices = await testDb.trustedDevice.findMany({ where: { userId } });
      expect(devices).toHaveLength(1);
    });
  });

  describe('Backup Codes', () => {
    describe('POST /api/2fa/backup-codes/generate', () => {
      it('should generate backup codes when 2FA enabled', async () => {
        const setupResponse = await request(app)
          .post('/api/2fa/totp/setup')
          .set('Authorization', `Bearer ${accessToken}`);

        const secret = setupResponse.body.data.secret;
        const code = speakeasy.totp({ secret, encoding: 'base32' });

        await request(app)
          .post('/api/2fa/totp/verify-setup')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ secret, code });

        const response = await request(app)
          .post('/api/2fa/backup-codes/generate')
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.backupCodes).toHaveLength(10);
      });

      it('should reject when 2FA not enabled', async () => {
        const response = await request(app)
          .post('/api/2fa/backup-codes/generate')
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(500);

        expect(response.body.success).toBe(false);
      });
    });

    describe('GET /api/2fa/backup-codes/count', () => {
      it('should return backup codes count', async () => {
        const response = await request(app)
          .get('/api/2fa/backup-codes/count')
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.count).toBe(0);
      });
    });

    describe('POST /api/2fa/verify-backup-code', () => {
      it('should verify backup code', async () => {
        const setupResponse = await request(app)
          .post('/api/2fa/totp/setup')
          .set('Authorization', `Bearer ${accessToken}`);

        const secret = setupResponse.body.data.secret;
        const code = speakeasy.totp({ secret, encoding: 'base32' });

        const verifySetupResponse = await request(app)
          .post('/api/2fa/totp/verify-setup')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ secret, code });

        const backupCodes = verifySetupResponse.body.data.backupCodes;

        const loginResponse = await request(app).post('/api/auth/login').send({
          emailOrUsername: 'test2fa@example.com',
          password: 'TestPass123!',
        });

        const tempToken = loginResponse.body.data.tempToken;

        const verifyResponse = await request(app)
          .post('/api/2fa/verify-backup-code')
          .send({
            tempToken,
            code: backupCodes[0],
          })
          .expect(200);

        expect(verifyResponse.body.success).toBe(true);
        expect(verifyResponse.body.data.accessToken).toBeDefined();
      });
    });
  });

  describe('2FA Methods Management', () => {
    describe('GET /api/2fa/methods', () => {
      it('should list 2FA methods', async () => {
        const response = await request(app)
          .get('/api/2fa/methods')
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.methods).toBeDefined();
      });
    });

    describe('DELETE /api/2fa/methods/:methodId', () => {
      it('should delete 2FA method', async () => {
        const setupResponse = await request(app)
          .post('/api/2fa/totp/setup')
          .set('Authorization', `Bearer ${accessToken}`);

        const secret = setupResponse.body.data.secret;
        const code = speakeasy.totp({ secret, encoding: 'base32' });

        await request(app)
          .post('/api/2fa/totp/verify-setup')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ secret, code });

        const method = await testDb.twoFactorMethod.findFirst({
          where: { userId, type: 'totp' },
        });

        const response = await request(app)
          .delete(`/api/2fa/methods/${method!.id}`)
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);

        const user = await testDb.user.findUnique({ where: { id: userId } });
        expect(user?.twoFactorEnabled).toBe(false);
      });
    });
  });

  describe('Trusted Devices', () => {
    describe('GET /api/2fa/devices', () => {
      it('should list trusted devices', async () => {
        const response = await request(app)
          .get('/api/2fa/devices')
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.devices).toBeDefined();
      });
    });

    describe('DELETE /api/2fa/devices/:deviceId', () => {
      it('should remove trusted device', async () => {
        const device = await testDb.trustedDevice.create({
          data: {
            userId,
            deviceToken: 'test-token',
            ipAddress: '127.0.0.1',
            userAgent: 'test',
            expiresAt: new Date(Date.now() + 86400000),
          },
        });

        const response = await request(app)
          .delete(`/api/2fa/devices/${device.id}`)
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);

        const deletedDevice = await testDb.trustedDevice.findUnique({
          where: { id: device.id },
        });
        expect(deletedDevice).toBeNull();
      });
    });

    describe('DELETE /api/2fa/devices', () => {
      it('should remove all trusted devices', async () => {
        await testDb.trustedDevice.createMany({
          data: [
            {
              userId,
              deviceToken: 'token1',
              ipAddress: '127.0.0.1',
              userAgent: 'test',
              expiresAt: new Date(Date.now() + 86400000),
            },
            {
              userId,
              deviceToken: 'token2',
              ipAddress: '127.0.0.1',
              userAgent: 'test',
              expiresAt: new Date(Date.now() + 86400000),
            },
          ],
        });

        const response = await request(app)
          .delete('/api/2fa/devices')
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);

        const devices = await testDb.trustedDevice.findMany({ where: { userId } });
        expect(devices).toHaveLength(0);
      });
    });
  });
});
