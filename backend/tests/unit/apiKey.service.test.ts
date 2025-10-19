import { cleanDatabase, createTestUser, testDb, disconnectTestDb } from '../helpers/testDb';
import { cleanRedis, disconnectTestRedis } from '../helpers/testRedis';
import { apiKeyService, ApiKeyService } from '../../src/services/apiKey.service';
import * as argon2 from 'argon2';

describe('API Key Service', () => {
  let testUserId: string;

  beforeEach(async () => {
    await cleanDatabase();
    await cleanRedis();
    const user = await createTestUser();
    testUserId = user.id;
  });

  afterAll(async () => {
    await disconnectTestDb();
    await disconnectTestRedis();
  });

  describe('createApiKey', () => {
    it('should create API key successfully', async () => {
      const result = await apiKeyService.createApiKey({
        userId: testUserId,
        name: 'Test Key',
        scopes: ['2fa:read', '2fa:write'],
        rateLimit: 1000,
      });

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.name).toBe('Test Key');
      expect(result.scopes).toEqual(['2fa:read', '2fa:write']);
      expect(result.rateLimit).toBe(1000);
      expect(result.apiKey).toBeDefined();
      expect(result.apiKey).toMatch(/^pk_live_/);
      expect(result.keyPrefix).toBe(result.apiKey!.substring(0, 12));
    });

    it('should hash API key in database', async () => {
      const result = await apiKeyService.createApiKey({
        userId: testUserId,
        name: 'Test Key',
        scopes: ['2fa:read'],
      });

      const dbKey = await testDb.apiKey.findUnique({
        where: { id: result.id },
      });

      expect(dbKey?.keyHash).toBeDefined();
      expect(dbKey?.keyHash).not.toBe(result.apiKey);

      // Verify hash is valid
      const isValid = await argon2.verify(dbKey!.keyHash, result.apiKey!);
      expect(isValid).toBe(true);
    });

    it('should set default rate limit if not provided', async () => {
      const result = await apiKeyService.createApiKey({
        userId: testUserId,
        name: 'Test Key',
        scopes: ['2fa:read'],
      });

      expect(result.rateLimit).toBe(1000);
    });

    it('should create key with expiration date', async () => {
      const expiresAt = new Date('2025-12-31');
      const result = await apiKeyService.createApiKey({
        userId: testUserId,
        name: 'Test Key',
        scopes: ['2fa:read'],
        expiresAt,
      });

      expect(result.expiresAt).toEqual(expiresAt);
    });
  });

  describe('listApiKeys', () => {
    it('should list all API keys for user', async () => {
      await apiKeyService.createApiKey({
        userId: testUserId,
        name: 'Key 1',
        scopes: ['2fa:read'],
      });

      await apiKeyService.createApiKey({
        userId: testUserId,
        name: 'Key 2',
        scopes: ['2fa:write'],
      });

      const keys = await apiKeyService.listApiKeys(testUserId);

      expect(keys).toHaveLength(2);
      expect(keys[0].name).toBe('Key 2'); // Most recent first
      expect(keys[1].name).toBe('Key 1');

      // Plaintext keys should not be returned
      expect(keys[0]).not.toHaveProperty('apiKey');
      expect(keys[1]).not.toHaveProperty('apiKey');
    });

    it('should return empty array if no keys', async () => {
      const keys = await apiKeyService.listApiKeys(testUserId);
      expect(keys).toEqual([]);
    });
  });

  describe('getApiKey', () => {
    it('should get specific API key', async () => {
      const created = await apiKeyService.createApiKey({
        userId: testUserId,
        name: 'Test Key',
        scopes: ['2fa:read'],
      });

      const result = await apiKeyService.getApiKey(created.id, testUserId);

      expect(result).toBeDefined();
      expect(result?.id).toBe(created.id);
      expect(result?.name).toBe('Test Key');
    });

    it('should return null for non-existent key', async () => {
      const result = await apiKeyService.getApiKey('non-existent', testUserId);
      expect(result).toBeNull();
    });

    it('should not return key from different user', async () => {
      const otherUser = await createTestUser({ email: 'other@example.com', username: 'otheruser' });
      const created = await apiKeyService.createApiKey({
        userId: otherUser.id,
        name: 'Test Key',
        scopes: ['2fa:read'],
      });

      const result = await apiKeyService.getApiKey(created.id, testUserId);
      expect(result).toBeNull();
    });
  });

  describe('updateApiKey', () => {
    it('should update API key name', async () => {
      const created = await apiKeyService.createApiKey({
        userId: testUserId,
        name: 'Old Name',
        scopes: ['2fa:read'],
      });

      const updated = await apiKeyService.updateApiKey(created.id, testUserId, {
        name: 'New Name',
      });

      expect(updated?.name).toBe('New Name');
    });

    it('should update scopes', async () => {
      const created = await apiKeyService.createApiKey({
        userId: testUserId,
        name: 'Test Key',
        scopes: ['2fa:read'],
      });

      const updated = await apiKeyService.updateApiKey(created.id, testUserId, {
        scopes: ['2fa:read', '2fa:write', 'webhooks:read'],
      });

      expect(updated?.scopes).toEqual(['2fa:read', '2fa:write', 'webhooks:read']);
    });

    it('should deactivate API key', async () => {
      const created = await apiKeyService.createApiKey({
        userId: testUserId,
        name: 'Test Key',
        scopes: ['2fa:read'],
      });

      const updated = await apiKeyService.updateApiKey(created.id, testUserId, {
        isActive: false,
      });

      expect(updated).toBeDefined();

      const dbKey = await testDb.apiKey.findUnique({
        where: { id: created.id },
      });
      expect(dbKey?.isActive).toBe(false);
    });
  });

  describe('rotateApiKey', () => {
    it('should generate new API key', async () => {
      const created = await apiKeyService.createApiKey({
        userId: testUserId,
        name: 'Test Key',
        scopes: ['2fa:read'],
      });

      const oldKey = created.apiKey;
      const oldPrefix = created.keyPrefix;

      const rotated = await apiKeyService.rotateApiKey(created.id, testUserId);

      expect(rotated).toBeDefined();
      expect(rotated?.apiKey).toBeDefined();
      expect(rotated?.apiKey).not.toBe(oldKey);
      expect(rotated?.keyPrefix).not.toBe(oldPrefix);
      expect(rotated?.name).toBe('Test Key'); // Name preserved
      expect(rotated?.scopes).toEqual(['2fa:read']); // Scopes preserved
    });

    it('should reset lastUsedAt', async () => {
      const created = await apiKeyService.createApiKey({
        userId: testUserId,
        name: 'Test Key',
        scopes: ['2fa:read'],
      });

      // Simulate usage
      await testDb.apiKey.update({
        where: { id: created.id },
        data: { lastUsedAt: new Date() },
      });

      const rotated = await apiKeyService.rotateApiKey(created.id, testUserId);
      expect(rotated?.lastUsedAt).toBeNull();
    });
  });

  describe('revokeApiKey', () => {
    it('should revoke API key', async () => {
      const created = await apiKeyService.createApiKey({
        userId: testUserId,
        name: 'Test Key',
        scopes: ['2fa:read'],
      });

      const result = await apiKeyService.revokeApiKey(created.id, testUserId);
      expect(result).toBe(true);

      const dbKey = await testDb.apiKey.findUnique({
        where: { id: created.id },
      });
      expect(dbKey?.isActive).toBe(false);
    });

    it('should return false for non-existent key', async () => {
      const result = await apiKeyService.revokeApiKey('non-existent', testUserId);
      expect(result).toBe(false);
    });
  });

  describe('deleteApiKey', () => {
    it('should delete API key', async () => {
      const created = await apiKeyService.createApiKey({
        userId: testUserId,
        name: 'Test Key',
        scopes: ['2fa:read'],
      });

      const result = await apiKeyService.deleteApiKey(created.id, testUserId);
      expect(result).toBe(true);

      const dbKey = await testDb.apiKey.findUnique({
        where: { id: created.id },
      });
      expect(dbKey).toBeNull();
    });
  });

  describe('validateScopes', () => {
    it('should validate correct scopes', () => {
      const validScopes = ['2fa:read', '2fa:write', 'webhooks:read'];
      expect(ApiKeyService.validateScopes(validScopes)).toBe(true);
    });

    it('should accept wildcard scope', () => {
      expect(ApiKeyService.validateScopes(['*'])).toBe(true);
    });

    it('should reject invalid scopes', () => {
      const invalidScopes = ['2fa:read', 'invalid:scope'];
      expect(ApiKeyService.validateScopes(invalidScopes)).toBe(false);
    });
  });
});
