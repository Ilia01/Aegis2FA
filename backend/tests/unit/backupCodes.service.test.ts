import { cleanDatabase, createTestUser, testDb, disconnectTestDb } from '../helpers/testDb';
import * as backupCodesService from '../../src/services/backupCodes.service';

describe('Backup Codes Service', () => {
  let testUser: any;

  beforeEach(async () => {
    await cleanDatabase();
    testUser = await createTestUser();
    await testDb.user.update({
      where: { id: testUser.id },
      data: { twoFactorEnabled: true },
    });
  });

  afterAll(async () => {
    await disconnectTestDb();
  });

  describe('generateUserBackupCodes', () => {
    it('should generate 10 backup codes', async () => {
      const codes = await backupCodesService.generateUserBackupCodes(testUser.id);

      expect(codes).toHaveLength(10);
      codes.forEach((code) => {
        expect(code).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/);
      });
    });

    it('should store hashed backup codes in database', async () => {
      const codes = await backupCodesService.generateUserBackupCodes(testUser.id);

      const storedCodes = await testDb.backupCode.findMany({
        where: { userId: testUser.id },
      });

      expect(storedCodes).toHaveLength(10);
      storedCodes.forEach((stored, index) => {
        expect(stored.codeHash).not.toBe(codes[index]);
      });
    });

    it('should replace existing backup codes', async () => {
      await backupCodesService.generateUserBackupCodes(testUser.id);
      const newCodes = await backupCodesService.generateUserBackupCodes(testUser.id);

      const storedCodes = await testDb.backupCode.findMany({
        where: { userId: testUser.id },
      });

      expect(storedCodes).toHaveLength(10);
      expect(newCodes).toHaveLength(10);
    });

    it('should reject if 2FA not enabled', async () => {
      await testDb.user.update({
        where: { id: testUser.id },
        data: { twoFactorEnabled: false },
      });

      await expect(backupCodesService.generateUserBackupCodes(testUser.id)).rejects.toThrow(
        '2FA must be enabled'
      );
    });
  });

  describe('verifyUserBackupCode', () => {
    let backupCodes: string[];

    beforeEach(async () => {
      backupCodes = await backupCodesService.generateUserBackupCodes(testUser.id);
    });

    it('should verify valid backup code', async () => {
      const isValid = await backupCodesService.verifyUserBackupCode(testUser.id, backupCodes[0]);

      expect(isValid).toBe(true);
    });

    it('should mark backup code as used', async () => {
      await backupCodesService.verifyUserBackupCode(testUser.id, backupCodes[0]);

      const code = await testDb.backupCode.findFirst({
        where: { userId: testUser.id, usedAt: { not: null } },
      });

      expect(code).toBeDefined();
      expect(code?.usedAt).toBeDefined();
    });

    it('should reject already used backup code', async () => {
      await backupCodesService.verifyUserBackupCode(testUser.id, backupCodes[0]);
      const isValid = await backupCodesService.verifyUserBackupCode(testUser.id, backupCodes[0]);

      expect(isValid).toBe(false);
    });

    it('should reject invalid backup code', async () => {
      const isValid = await backupCodesService.verifyUserBackupCode(testUser.id, 'INVALID-CODE');

      expect(isValid).toBe(false);
    });

    it('should return false when no backup codes exist', async () => {
      await testDb.backupCode.deleteMany({ where: { userId: testUser.id } });

      const isValid = await backupCodesService.verifyUserBackupCode(testUser.id, backupCodes[0]);

      expect(isValid).toBe(false);
    });
  });

  describe('getBackupCodesCount', () => {
    it('should return count of unused backup codes', async () => {
      await backupCodesService.generateUserBackupCodes(testUser.id);

      const count = await backupCodesService.getBackupCodesCount(testUser.id);

      expect(count).toBe(10);
    });

    it('should exclude used backup codes', async () => {
      const codes = await backupCodesService.generateUserBackupCodes(testUser.id);
      await backupCodesService.verifyUserBackupCode(testUser.id, codes[0]);

      const count = await backupCodesService.getBackupCodesCount(testUser.id);

      expect(count).toBe(9);
    });

    it('should return 0 when no backup codes exist', async () => {
      const count = await backupCodesService.getBackupCodesCount(testUser.id);

      expect(count).toBe(0);
    });
  });

  describe('hasBackupCodes', () => {
    it('should return true when backup codes exist', async () => {
      await backupCodesService.generateUserBackupCodes(testUser.id);

      const hasCodes = await backupCodesService.hasBackupCodes(testUser.id);

      expect(hasCodes).toBe(true);
    });

    it('should return false when no backup codes exist', async () => {
      const hasCodes = await backupCodesService.hasBackupCodes(testUser.id);

      expect(hasCodes).toBe(false);
    });
  });
});
