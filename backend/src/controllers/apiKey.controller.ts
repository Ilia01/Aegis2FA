import { Request, Response } from 'express';
import { apiKeyService, ApiKeyService } from '../services/apiKey.service';
import { z } from 'zod';

/**
 * API Key Controller
 * Handles CRUD operations for API keys
 */

const createApiKeySchema = z.object({
  name: z.string().min(1).max(100),
  scopes: z.array(z.string()).min(1),
  expiresAt: z.string().datetime().optional(),
  rateLimit: z.number().int().min(1).max(100000).optional(),
});

const updateApiKeySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  scopes: z.array(z.string()).min(1).optional(),
  rateLimit: z.number().int().min(1).max(100000).optional(),
  isActive: z.boolean().optional(),
});

/**
 * POST /api/api-keys
 * Create a new API key
 */
export const createApiKey = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId;

    const validation = createApiKeySchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        success: false,
        message: 'Invalid input',
        errors: validation.error.errors,
      });
      return;
    }

    const { name, scopes, expiresAt, rateLimit } = validation.data;

    if (!ApiKeyService.validateScopes(scopes)) {
      res.status(400).json({
        success: false,
        message: 'Invalid scopes. Valid scopes: *, 2fa:read, 2fa:write, user:read, webhooks:read, webhooks:write',
      });
      return;
    }

    const apiKey = await apiKeyService.createApiKey({
      userId,
      name,
      scopes,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      rateLimit,
    });

    res.status(201).json({
      success: true,
      message: 'API key created successfully. Save the key securely - it won\'t be shown again.',
      data: apiKey,
    });
  } catch (error: any) {
    console.error('Create API key error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create API key',
    });
  }
};

/**
 * GET /api/api-keys
 * List all API keys for the authenticated user
 */
export const listApiKeys = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId;

    const apiKeys = await apiKeyService.listApiKeys(userId);

    res.status(200).json({
      success: true,
      data: apiKeys,
    });
  } catch (error: any) {
    console.error('List API keys error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to list API keys',
    });
  }
};

/**
 * GET /api/api-keys/:id
 * Get a specific API key
 */
export const getApiKey = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const apiKeyId = req.params.id;

    // Validate API key ID format to prevent injection attacks
    if (!apiKeyId || typeof apiKeyId !== 'string' || !/^[a-zA-Z0-9\-_]{20,36}$/.test(apiKeyId)) {
      res.status(400).json({
        success: false,
        message: 'Invalid API key ID format',
      });
      return;
    }

    const apiKey = await apiKeyService.getApiKey(apiKeyId, userId);

    if (!apiKey) {
      res.status(404).json({
        success: false,
        message: 'API key not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: apiKey,
    });
  } catch (error: any) {
    console.error('Get API key error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get API key',
    });
  }
};

/**
 * PATCH /api/api-keys/:id
 * Update an API key
 */
export const updateApiKey = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const apiKeyId = req.params.id;

    const validation = updateApiKeySchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        success: false,
        message: 'Invalid input',
        errors: validation.error.errors,
      });
      return;
    }

    const updates = validation.data;

    if (updates.scopes && !ApiKeyService.validateScopes(updates.scopes)) {
      res.status(400).json({
        success: false,
        message: 'Invalid scopes',
      });
      return;
    }

    const apiKey = await apiKeyService.updateApiKey(apiKeyId, userId, updates);

    if (!apiKey) {
      res.status(404).json({
        success: false,
        message: 'API key not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'API key updated successfully',
      data: apiKey,
    });
  } catch (error: any) {
    console.error('Update API key error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update API key',
    });
  }
};

/**
 * POST /api/api-keys/:id/rotate
 * Rotate an API key (generate new key)
 */
export const rotateApiKey = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const apiKeyId = req.params.id;

    const apiKey = await apiKeyService.rotateApiKey(apiKeyId, userId);

    if (!apiKey) {
      res.status(404).json({
        success: false,
        message: 'API key not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'API key rotated successfully. Save the new key securely - it won\'t be shown again.',
      data: apiKey,
    });
  } catch (error: any) {
    console.error('Rotate API key error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to rotate API key',
    });
  }
};

/**
 * POST /api/api-keys/:id/revoke
 * Revoke (deactivate) an API key
 */
export const revokeApiKey = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const apiKeyId = req.params.id;

    const success = await apiKeyService.revokeApiKey(apiKeyId, userId);

    if (!success) {
      res.status(404).json({
        success: false,
        message: 'API key not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'API key revoked successfully',
    });
  } catch (error: any) {
    console.error('Revoke API key error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to revoke API key',
    });
  }
};

/**
 * DELETE /api/api-keys/:id
 * Delete an API key permanently
 */
export const deleteApiKey = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const apiKeyId = req.params.id;

    const success = await apiKeyService.deleteApiKey(apiKeyId, userId);

    if (!success) {
      res.status(404).json({
        success: false,
        message: 'API key not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'API key deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete API key error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete API key',
    });
  }
};
