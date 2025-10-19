import { prisma } from '../config/database';
import { Queue } from 'bullmq';
import { redis } from '../config/redis';
import * as crypto from 'crypto';
import axios from 'axios';

/**
 * Webhook Service
 * Handles webhook registration, delivery, retry logic, and signature verification
 */

interface CreateWebhookParams {
  userId: string;
  url: string;
  events: string[];
}

interface WebhookEvent {
  event: string;
  data: any;
  userId: string;
  timestamp: string;
}

interface WebhookResponse {
  id: string;
  url: string;
  events: string[];
  secret: string; // Only shown once during creation
  isActive: boolean;
  failureCount: number;
  lastSuccess: Date | null;
  lastFailure: Date | null;
  createdAt: Date;
}

// Create BullMQ queue for webhook delivery
const webhookQueue = new Queue('webhooks', {
  connection: redis,
  defaultJobOptions: {
    attempts: 5, // Retry up to 5 times
    backoff: {
      type: 'exponential',
      delay: 2000, // Start with 2 seconds
    },
    removeOnComplete: 100, // Keep last 100 successful deliveries
    removeOnFail: 500, // Keep last 500 failed deliveries
  },
});

export class WebhookService {
  /**
   * Supported webhook events
   */
  static readonly SUPPORTED_EVENTS = [
    '2fa.enabled',    // When user enables 2FA
    '2fa.disabled',   // When user disables 2FA
    '2fa.verified',   // When 2FA code is successfully verified
    '2fa.failed',     // When 2FA verification fails
    'user.login',     // When user logs in
    'user.logout',    // When user logs out
  ];

  /**
   * Generate webhook secret for HMAC signature
   */
  private generateSecret(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Create HMAC signature for webhook payload
   */
  static createSignature(payload: string, secret: string): string {
    return crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
  }

  /**
   * Verify webhook signature
   */
  static verifySignature(payload: string, signature: string, secret: string): boolean {
    const expectedSignature = this.createSignature(payload, secret);
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  /**
   * Validate events array
   */
  static validateEvents(events: string[]): boolean {
    return events.length > 0 && events.every((event) =>
      WebhookService.SUPPORTED_EVENTS.includes(event)
    );
  }

  /**
   * Create a new webhook
   */
  async createWebhook(params: CreateWebhookParams): Promise<WebhookResponse> {
    const { userId, url, events } = params;

    // Validate events
    if (!WebhookService.validateEvents(events)) {
      throw new Error('Invalid events. Supported events: ' + WebhookService.SUPPORTED_EVENTS.join(', '));
    }

    // Validate URL
    try {
      new URL(url);
    } catch (error) {
      throw new Error('Invalid URL format');
    }

    // Generate secret
    const secret = this.generateSecret();

    // Create webhook in database
    const webhook = await prisma.webhook.create({
      data: {
        userId,
        url,
        events,
        secret,
        isActive: true,
      },
    });

    return {
      id: webhook.id,
      url: webhook.url,
      events: webhook.events,
      secret: webhook.secret, // ONLY shown during creation
      isActive: webhook.isActive,
      failureCount: webhook.failureCount,
      lastSuccess: webhook.lastSuccess,
      lastFailure: webhook.lastFailure,
      createdAt: webhook.createdAt,
    };
  }

  /**
   * List all webhooks for a user
   */
  async listWebhooks(userId: string): Promise<Omit<WebhookResponse, 'secret'>[]> {
    const webhooks = await prisma.webhook.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return webhooks.map((webhook) => ({
      id: webhook.id,
      url: webhook.url,
      events: webhook.events,
      isActive: webhook.isActive,
      failureCount: webhook.failureCount,
      lastSuccess: webhook.lastSuccess,
      lastFailure: webhook.lastFailure,
      createdAt: webhook.createdAt,
    }));
  }

  /**
   * Get a specific webhook
   */
  async getWebhook(webhookId: string, userId: string): Promise<Omit<WebhookResponse, 'secret'> | null> {
    const webhook = await prisma.webhook.findFirst({
      where: { id: webhookId, userId },
    });

    if (!webhook) {
      return null;
    }

    return {
      id: webhook.id,
      url: webhook.url,
      events: webhook.events,
      isActive: webhook.isActive,
      failureCount: webhook.failureCount,
      lastSuccess: webhook.lastSuccess,
      lastFailure: webhook.lastFailure,
      createdAt: webhook.createdAt,
    };
  }

  /**
   * Update webhook
   */
  async updateWebhook(
    webhookId: string,
    userId: string,
    updates: { url?: string; events?: string[]; isActive?: boolean }
  ): Promise<Omit<WebhookResponse, 'secret'> | null> {
    // Verify ownership
    const existing = await prisma.webhook.findFirst({
      where: { id: webhookId, userId },
    });

    if (!existing) {
      return null;
    }

    // Validate events if provided
    if (updates.events && !WebhookService.validateEvents(updates.events)) {
      throw new Error('Invalid events');
    }

    // Validate URL if provided
    if (updates.url) {
      try {
        new URL(updates.url);
      } catch (error) {
        throw new Error('Invalid URL format');
      }
    }

    const updated = await prisma.webhook.update({
      where: { id: webhookId },
      data: updates,
    });

    return {
      id: updated.id,
      url: updated.url,
      events: updated.events,
      isActive: updated.isActive,
      failureCount: updated.failureCount,
      lastSuccess: updated.lastSuccess,
      lastFailure: updated.lastFailure,
      createdAt: updated.createdAt,
    };
  }

  /**
   * Delete webhook
   */
  async deleteWebhook(webhookId: string, userId: string): Promise<boolean> {
    const result = await prisma.webhook.deleteMany({
      where: { id: webhookId, userId },
    });

    return result.count > 0;
  }

  /**
   * Fire webhook event (add to queue for delivery)
   */
  async fireEvent(event: WebhookEvent): Promise<void> {
    const { event: eventType, data, userId, timestamp } = event;

    // Find all active webhooks subscribed to this event
    const webhooks = await prisma.webhook.findMany({
      where: {
        userId,
        isActive: true,
        events: {
          has: eventType,
        },
      },
    });

    // Add webhook delivery jobs to queue
    for (const webhook of webhooks) {
      await webhookQueue.add('deliver', {
        webhookId: webhook.id,
        url: webhook.url,
        secret: webhook.secret,
        event: eventType,
        data,
        timestamp,
      });
    }
  }

  /**
   * Deliver webhook (called by queue worker)
   */
  async deliverWebhook(job: {
    webhookId: string;
    url: string;
    secret: string;
    event: string;
    data: any;
    timestamp: string;
  }): Promise<void> {
    const { webhookId, url, secret, event, data, timestamp } = job;

    const payload = JSON.stringify({
      event,
      data,
      timestamp,
    });

    const signature = WebhookService.createSignature(payload, secret);

    try {
      // Deliver webhook with timeout
      const response = await axios.post(url, payload, {
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Webhook-Event': event,
          'User-Agent': '2FA-Service-Webhook/1.0',
        },
        timeout: 10000, // 10 second timeout
      });

      // Log successful delivery
      await prisma.webhookDelivery.create({
        data: {
          webhookId,
          event,
          payload,
          statusCode: response.status,
          response: JSON.stringify(response.data).substring(0, 1000), // Limit to 1000 chars
          success: true,
          attempt: 1,
        },
      });

      // Update webhook success stats
      await prisma.webhook.update({
        where: { id: webhookId },
        data: {
          lastSuccess: new Date(),
          failureCount: 0, // Reset failure count on success
        },
      });
    } catch (error: any) {
      // Log failed delivery
      await prisma.webhookDelivery.create({
        data: {
          webhookId,
          event,
          payload,
          statusCode: error.response?.status || null,
          response: error.message.substring(0, 1000),
          success: false,
          error: error.message,
          attempt: 1,
        },
      });

      // Update webhook failure stats
      const webhook = await prisma.webhook.update({
        where: { id: webhookId },
        data: {
          lastFailure: new Date(),
          failureCount: { increment: 1 },
        },
      });

      // Disable webhook after 10 consecutive failures
      if (webhook.failureCount >= 10) {
        await prisma.webhook.update({
          where: { id: webhookId },
          data: { isActive: false },
        });
      }

      throw error; // Re-throw for queue retry logic
    }
  }

  /**
   * Test webhook endpoint
   */
  async testWebhook(webhookId: string, userId: string): Promise<{ success: boolean; message: string }> {
    const webhook = await prisma.webhook.findFirst({
      where: { id: webhookId, userId },
    });

    if (!webhook) {
      return { success: false, message: 'Webhook not found' };
    }

    // Fire test event
    await this.fireEvent({
      event: 'webhook.test',
      data: { message: 'This is a test webhook delivery' },
      userId,
      timestamp: new Date().toISOString(),
    });

    return { success: true, message: 'Test webhook queued for delivery' };
  }
}

export const webhookService = new WebhookService();
export { webhookQueue };
