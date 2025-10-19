import { prisma } from '../config/database';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';

/**
 * API Key Service
 * Handles creation, validation, and management of API keys for third-party integration
 */

interface CreateApiKeyParams {
  userId: string;
  name: string;
  scopes: string[];
  expiresAt?: Date;
  rateLimit?: number;
}

interface ApiKeyResponse {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  expiresAt: Date | null;
  rateLimit: number;
  createdAt: Date;
  lastUsedAt: Date | null;
  // Only returned once during creation
  apiKey?: string;
}

export class ApiKeyService {
  /**
   * Generate a secure API key with format: pk_{env}_{random}
   */
  private generateApiKey(environment: 'live' | 'test' = 'live'): { key: string; prefix: string } {
    // Generate 32 bytes of random data
    const randomBytes = crypto.randomBytes(32);
    const randomString = randomBytes.toString('base64url'); // URL-safe base64

    // Format: pk_live_... or pk_test_...
    const key = `pk_${environment}_${randomString}`;
    const prefix = key.substring(0, 12); // First 12 chars for identification

    return { key, prefix };
  }

  /**
   * Create a new API key for a user
   */
  async createApiKey(params: CreateApiKeyParams): Promise<ApiKeyResponse> {
    const { userId, name, scopes, expiresAt, rateLimit = 1000 } = params;

    // Generate API key
    const { key, prefix } = this.generateApiKey();

    // Hash the API key (never store plaintext)
    const keyHash = await argon2.hash(key);

    // Create API key in database
    const apiKey = await prisma.apiKey.create({
      data: {
        userId,
        name,
        keyHash,
        keyPrefix: prefix,
        scopes,
        expiresAt: expiresAt || null,
        rateLimit,
        isActive: true,
      },
    });

    // Return API key response (plaintext key only shown once)
    return {
      id: apiKey.id,
      name: apiKey.name,
      keyPrefix: apiKey.keyPrefix,
      scopes: apiKey.scopes,
      expiresAt: apiKey.expiresAt,
      rateLimit: apiKey.rateLimit,
      createdAt: apiKey.createdAt,
      lastUsedAt: apiKey.lastUsedAt,
      apiKey: key, // ONLY returned during creation
    };
  }

  /**
   * List all API keys for a user (without plaintext keys)
   */
  async listApiKeys(userId: string): Promise<ApiKeyResponse[]> {
    const apiKeys = await prisma.apiKey.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return apiKeys.map((key) => ({
      id: key.id,
      name: key.name,
      keyPrefix: key.keyPrefix,
      scopes: key.scopes,
      expiresAt: key.expiresAt,
      rateLimit: key.rateLimit,
      createdAt: key.createdAt,
      lastUsedAt: key.lastUsedAt,
    }));
  }

  /**
   * Get a specific API key by ID
   */
  async getApiKey(apiKeyId: string, userId: string): Promise<ApiKeyResponse | null> {
    const apiKey = await prisma.apiKey.findFirst({
      where: {
        id: apiKeyId,
        userId,
      },
    });

    if (!apiKey) {
      return null;
    }

    return {
      id: apiKey.id,
      name: apiKey.name,
      keyPrefix: apiKey.keyPrefix,
      scopes: apiKey.scopes,
      expiresAt: apiKey.expiresAt,
      rateLimit: apiKey.rateLimit,
      createdAt: apiKey.createdAt,
      lastUsedAt: apiKey.lastUsedAt,
    };
  }

  /**
   * Update API key properties (name, scopes, rate limit)
   */
  async updateApiKey(
    apiKeyId: string,
    userId: string,
    updates: {
      name?: string;
      scopes?: string[];
      rateLimit?: number;
      isActive?: boolean;
    }
  ): Promise<ApiKeyResponse | null> {
    // Verify ownership
    const existing = await prisma.apiKey.findFirst({
      where: { id: apiKeyId, userId },
    });

    if (!existing) {
      return null;
    }

    const updated = await prisma.apiKey.update({
      where: { id: apiKeyId },
      data: updates,
    });

    return {
      id: updated.id,
      name: updated.name,
      keyPrefix: updated.keyPrefix,
      scopes: updated.scopes,
      expiresAt: updated.expiresAt,
      rateLimit: updated.rateLimit,
      createdAt: updated.createdAt,
      lastUsedAt: updated.lastUsedAt,
    };
  }

  /**
   * Rotate an API key (generate new key, revoke old one)
   */
  async rotateApiKey(apiKeyId: string, userId: string): Promise<ApiKeyResponse | null> {
    // Get existing API key
    const existing = await prisma.apiKey.findFirst({
      where: { id: apiKeyId, userId },
    });

    if (!existing) {
      return null;
    }

    // Generate new API key
    const { key, prefix } = this.generateApiKey();
    const keyHash = await argon2.hash(key);

    // Update with new key
    const updated = await prisma.apiKey.update({
      where: { id: apiKeyId },
      data: {
        keyHash,
        keyPrefix: prefix,
        lastUsedAt: null, // Reset usage stats
      },
    });

    return {
      id: updated.id,
      name: updated.name,
      keyPrefix: updated.keyPrefix,
      scopes: updated.scopes,
      expiresAt: updated.expiresAt,
      rateLimit: updated.rateLimit,
      createdAt: updated.createdAt,
      lastUsedAt: updated.lastUsedAt,
      apiKey: key, // Return new plaintext key
    };
  }

  /**
   * Revoke (deactivate) an API key
   */
  async revokeApiKey(apiKeyId: string, userId: string): Promise<boolean> {
    const result = await prisma.apiKey.updateMany({
      where: {
        id: apiKeyId,
        userId,
      },
      data: {
        isActive: false,
      },
    });

    return result.count > 0;
  }

  /**
   * Delete an API key permanently
   */
  async deleteApiKey(apiKeyId: string, userId: string): Promise<boolean> {
    const result = await prisma.apiKey.deleteMany({
      where: {
        id: apiKeyId,
        userId,
      },
    });

    return result.count > 0;
  }

  /**
   * Validate scopes
   */
  static validateScopes(scopes: string[]): boolean {
    const validScopes = [
      '*', // Wildcard - all permissions
      '2fa:read',
      '2fa:write',
      'user:read',
      'webhooks:read',
      'webhooks:write',
    ];

    return scopes.every((scope) => validScopes.includes(scope));
  }
}

export const apiKeyService = new ApiKeyService();
