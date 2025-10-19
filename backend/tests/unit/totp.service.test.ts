import { cleanDatabase, createTestUser, testDb, disconnectTestDb } from '../helpers/testDb';
import * as totpService from '../../src/services/totp.service';
import speakeasy from 'speakeasy';

describe('TOTP Service', () => {
  let testUser: any;

  beforeEach(async () => {
    await cleanDatabase();
    testUser = await createTestUser();
  });

  afterAll(async () => {
    await disconnectTestDb();
  });

  describe('setupTOTP', () => {
    it('should generate TOTP secret and QR code', async () => {
      const result = await totpService.setupTOTP(testUser.id);

      expect(result.secret).toBeDefined();
      expect(result.qrCode).toBeDefined();
      expect(result.qrCode).toContain('otpauth://totp/');
      expect(result.backupCodes).toBeDefined();
      expect(result.backupCodes).toHaveLength(10);
    });

    it('should throw error for non-existent user', async () => {
      await expect(totpService.setupTOTP('non-existent-id')).rejects.toThrow('User not found');
    });
  });

  describe('verifyAndEnableTOTP', () => {
    it('should verify valid TOTP code and enable 2FA', async () => {
      const secret = speakeasy.generateSecret().base32;
      const code = speakeasy.totp({
        secret,
        encoding: 'base32',
      });

      const result = await totpService.verifyAndEnableTOTP(testUser.id, secret, code);

      expect(result.backupCodes).toBeDefined();
      expect(result.backupCodes).toHaveLength(10);

      const user = await testDb.user.findUnique({ where: { id: testUser.id } });
      expect(user?.twoFactorEnabled).toBe(true);

      const method = await testDb.twoFactorMethod.findFirst({
        where: { userId: testUser.id, type: 'totp' },
      });
      expect(method).toBeDefined();
      expect(method?.enabled).toBe(true);
    });

    it('should reject invalid TOTP code', async () => {
      const secret = speakeasy.generateSecret().base32;

      await expect(
        totpService.verifyAndEnableTOTP(testUser.id, secret, '000000')
      ).rejects.toThrow('Invalid verification code');
    });

    it('should update existing TOTP method', async () => {
      await testDb.twoFactorMethod.create({
        data: {
          userId: testUser.id,
          type: 'totp',
          secret: 'old-secret',
          enabled: false,
        },
      });

      const secret = speakeasy.generateSecret().base32;
      const code = speakeasy.totp({ secret, encoding: 'base32' });

      await totpService.verifyAndEnableTOTP(testUser.id, secret, code);

      const methods = await testDb.twoFactorMethod.findMany({
        where: { userId: testUser.id, type: 'totp' },
      });

      expect(methods).toHaveLength(1);
      expect(methods[0].secret).toBe(secret);
    });
  });

  describe('verifyTOTP', () => {
    it('should verify valid TOTP code', async () => {
      const secret = speakeasy.generateSecret().base32;

      await testDb.twoFactorMethod.create({
        data: {
          userId: testUser.id,
          type: 'totp',
          secret,
          enabled: true,
        },
      });

      const code = speakeasy.totp({ secret, encoding: 'base32' });
      const isValid = await totpService.verifyTOTP(testUser.id, code);

      expect(isValid).toBe(true);
    });

    it('should reject invalid TOTP code', async () => {
      const secret = speakeasy.generateSecret().base32;

      await testDb.twoFactorMethod.create({
        data: {
          userId: testUser.id,
          type: 'totp',
          secret,
          enabled: true,
        },
      });

      const isValid = await totpService.verifyTOTP(testUser.id, '000000');

      expect(isValid).toBe(false);
    });

    it('should return false for user without TOTP', async () => {
      const isValid = await totpService.verifyTOTP(testUser.id, '123456');

      expect(isValid).toBe(false);
    });
  });

  describe('disableTOTP', () => {
    it('should disable TOTP and 2FA if no other methods', async () => {
      await testDb.user.update({
        where: { id: testUser.id },
        data: { twoFactorEnabled: true },
      });

      await testDb.twoFactorMethod.create({
        data: {
          userId: testUser.id,
          type: 'totp',
          secret: 'test-secret',
          enabled: true,
        },
      });

      await totpService.disableTOTP(testUser.id);

      const method = await testDb.twoFactorMethod.findFirst({
        where: { userId: testUser.id, type: 'totp' },
      });
      expect(method).toBeNull();

      const user = await testDb.user.findUnique({ where: { id: testUser.id } });
      expect(user?.twoFactorEnabled).toBe(false);
    });

    it('should keep 2FA enabled if other methods exist', async () => {
      await testDb.user.update({
        where: { id: testUser.id },
        data: { twoFactorEnabled: true },
      });

      await testDb.twoFactorMethod.createMany({
        data: [
          {
            userId: testUser.id,
            type: 'totp',
            secret: 'test-secret',
            enabled: true,
          },
          {
            userId: testUser.id,
            type: 'sms',
            phoneNumber: '+1234567890',
            enabled: true,
          },
        ],
      });

      await totpService.disableTOTP(testUser.id);

      const user = await testDb.user.findUnique({ where: { id: testUser.id } });
      expect(user?.twoFactorEnabled).toBe(true);
    });
  });
});
