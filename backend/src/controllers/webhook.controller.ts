import { Request, Response } from 'express';
import { webhookService, WebhookService } from '../services/webhook.service';
import { z } from 'zod';

/**
 * Webhook Controller
 * Handles webhook CRUD operations and testing
 */

const createWebhookSchema = z.object({
  url: z.string().url(),
  events: z.array(z.string()).min(1),
});

const updateWebhookSchema = z.object({
  url: z.string().url().optional(),
  events: z.array(z.string()).min(1).optional(),
  isActive: z.boolean().optional(),
});

/**
 * POST /api/webhooks
 * Create a new webhook
 */
export const createWebhook = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId;

    const validation = createWebhookSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        success: false,
        message: 'Invalid input',
        errors: validation.error.errors,
      });
      return;
    }

    const { url, events } = validation.data;

    if (!WebhookService.validateEvents(events)) {
      res.status(400).json({
        success: false,
        message: `Invalid events. Supported events: ${WebhookService.SUPPORTED_EVENTS.join(', ')}`,
      });
      return;
    }

    const webhook = await webhookService.createWebhook({
      userId,
      url,
      events,
    });

    res.status(201).json({
      success: true,
      message: 'Webhook created successfully. Save the secret securely - it won\'t be shown again.',
      data: webhook,
    });
  } catch (error: any) {
    console.error('Create webhook error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create webhook',
    });
  }
};

/**
 * GET /api/webhooks
 * List all webhooks for the authenticated user
 */
export const listWebhooks = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId;

    const webhooks = await webhookService.listWebhooks(userId);

    res.status(200).json({
      success: true,
      data: webhooks,
    });
  } catch (error: any) {
    console.error('List webhooks error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to list webhooks',
    });
  }
};

/**
 * GET /api/webhooks/:id
 * Get a specific webhook
 */
export const getWebhook = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const webhookId = req.params.id;

    const webhook = await webhookService.getWebhook(webhookId, userId);

    if (!webhook) {
      res.status(404).json({
        success: false,
        message: 'Webhook not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: webhook,
    });
  } catch (error: any) {
    console.error('Get webhook error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get webhook',
    });
  }
};

/**
 * PATCH /api/webhooks/:id
 * Update a webhook
 */
export const updateWebhook = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const webhookId = req.params.id;

    const validation = updateWebhookSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        success: false,
        message: 'Invalid input',
        errors: validation.error.errors,
      });
      return;
    }

    const updates = validation.data;

    if (updates.events && !WebhookService.validateEvents(updates.events)) {
      res.status(400).json({
        success: false,
        message: `Invalid events. Supported events: ${WebhookService.SUPPORTED_EVENTS.join(', ')}`,
      });
      return;
    }

    const webhook = await webhookService.updateWebhook(webhookId, userId, updates);

    if (!webhook) {
      res.status(404).json({
        success: false,
        message: 'Webhook not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Webhook updated successfully',
      data: webhook,
    });
  } catch (error: any) {
    console.error('Update webhook error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update webhook',
    });
  }
};

/**
 * DELETE /api/webhooks/:id
 * Delete a webhook
 */
export const deleteWebhook = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const webhookId = req.params.id;

    const success = await webhookService.deleteWebhook(webhookId, userId);

    if (!success) {
      res.status(404).json({
        success: false,
        message: 'Webhook not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Webhook deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete webhook error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete webhook',
    });
  }
};

/**
 * POST /api/webhooks/:id/test
 * Test a webhook by sending a test event
 */
export const testWebhook = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const webhookId = req.params.id;

    const result = await webhookService.testWebhook(webhookId, userId);

    if (!result.success) {
      res.status(404).json(result);
      return;
    }

    res.status(200).json(result);
  } catch (error: any) {
    console.error('Test webhook error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to test webhook',
    });
  }
};

/**
 * GET /api/webhooks/events
 * Get list of supported webhook events
 */
export const getSupportedEvents = (_req: Request, res: Response): void => {
  res.status(200).json({
    success: true,
    data: {
      events: WebhookService.SUPPORTED_EVENTS,
      descriptions: {
        '2fa.enabled': 'Fired when a user enables two-factor authentication',
        '2fa.disabled': 'Fired when a user disables two-factor authentication',
        '2fa.verified': 'Fired when a 2FA code is successfully verified during login',
        '2fa.failed': 'Fired when a 2FA verification attempt fails',
        'user.login': 'Fired when a user successfully logs in',
        'user.logout': 'Fired when a user logs out',
      },
    },
  });
};
