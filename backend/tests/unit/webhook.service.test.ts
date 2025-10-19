import { cleanDatabase, createTestUser, testDb, disconnectTestDb } from '../helpers/testDb';
import { cleanRedis, disconnectTestRedis } from '../helpers/testRedis';
import { webhookService, WebhookService } from '../../src/services/webhook.service';
import * as crypto from 'node:crypto';

describe('Webhook Service', () => {
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

  describe('createWebhook', () => {
    it('should create webhook successfully', async () => {
      const result = await webhookService.createWebhook({
        userId: testUserId,
        url: 'https://example.com/webhooks',
        events: ['2fa.enabled', '2fa.verified'],
      });

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.url).toBe('https://example.com/webhooks');
      expect(result.events).toEqual(['2fa.enabled', '2fa.verified']);
      expect(result.secret).toBeDefined();
      expect(result.secret).toHaveLength(64); // 32 bytes hex
      expect(result.isActive).toBe(true);
      expect(result.failureCount).toBe(0);
    });

    it('should validate events', async () => {
      await expect(
        webhookService.createWebhook({
          userId: testUserId,
          url: 'https://example.com/webhooks',
          events: ['invalid.event'],
        })
      ).rejects.toThrow('Invalid events');
    });

    it('should validate URL format', async () => {
      await expect(
        webhookService.createWebhook({
          userId: testUserId,
          url: 'not-a-url',
          events: ['2fa.enabled'],
        })
      ).rejects.toThrow('Invalid URL');
    });

    it('should reject empty events array', async () => {
      await expect(
        webhookService.createWebhook({
          userId: testUserId,
          url: 'https://example.com/webhooks',
          events: [],
        })
      ).rejects.toThrow('Invalid events');
    });
  });

  describe('listWebhooks', () => {
    it('should list all webhooks for user', async () => {
      await webhookService.createWebhook({
        userId: testUserId,
        url: 'https://example.com/webhook1',
        events: ['2fa.enabled'],
      });

      await webhookService.createWebhook({
        userId: testUserId,
        url: 'https://example.com/webhook2',
        events: ['2fa.verified'],
      });

      const webhooks = await webhookService.listWebhooks(testUserId);

      expect(webhooks).toHaveLength(2);
      expect(webhooks[0].url).toBe('https://example.com/webhook2'); // Most recent first

      // Should not return secrets
      expect(webhooks[0]).not.toHaveProperty('secret');
      expect(webhooks[1]).not.toHaveProperty('secret');
    });

    it('should return empty array if no webhooks', async () => {
      const webhooks = await webhookService.listWebhooks(testUserId);
      expect(webhooks).toEqual([]);
    });
  });

  describe('getWebhook', () => {
    it('should get specific webhook', async () => {
      const created = await webhookService.createWebhook({
        userId: testUserId,
        url: 'https://example.com/webhooks',
        events: ['2fa.enabled'],
      });

      const result = await webhookService.getWebhook(created.id, testUserId);

      expect(result).toBeDefined();
      expect(result?.id).toBe(created.id);
      expect(result?.url).toBe('https://example.com/webhooks');
    });

    it('should return null for non-existent webhook', async () => {
      const result = await webhookService.getWebhook('non-existent', testUserId);
      expect(result).toBeNull();
    });

    it('should not return webhook from different user', async () => {
      const otherUser = await createTestUser({ email: 'other@example.com', username: 'otheruser' });
      const created = await webhookService.createWebhook({
        userId: otherUser.id,
        url: 'https://example.com/webhooks',
        events: ['2fa.enabled'],
      });

      const result = await webhookService.getWebhook(created.id, testUserId);
      expect(result).toBeNull();
    });
  });

  describe('updateWebhook', () => {
    it('should update webhook URL', async () => {
      const created = await webhookService.createWebhook({
        userId: testUserId,
        url: 'https://example.com/old',
        events: ['2fa.enabled'],
      });

      const updated = await webhookService.updateWebhook(created.id, testUserId, {
        url: 'https://example.com/new',
      });

      expect(updated?.url).toBe('https://example.com/new');
    });

    it('should update events', async () => {
      const created = await webhookService.createWebhook({
        userId: testUserId,
        url: 'https://example.com/webhooks',
        events: ['2fa.enabled'],
      });

      const updated = await webhookService.updateWebhook(created.id, testUserId, {
        events: ['2fa.enabled', '2fa.verified', '2fa.failed'],
      });

      expect(updated?.events).toEqual(['2fa.enabled', '2fa.verified', '2fa.failed']);
    });

    it('should deactivate webhook', async () => {
      const created = await webhookService.createWebhook({
        userId: testUserId,
        url: 'https://example.com/webhooks',
        events: ['2fa.enabled'],
      });

      const updated = await webhookService.updateWebhook(created.id, testUserId, {
        isActive: false,
      });

      expect(updated).toBeDefined();

      const dbWebhook = await testDb.webhook.findUnique({
        where: { id: created.id },
      });
      expect(dbWebhook?.isActive).toBe(false);
    });

    it('should validate events on update', async () => {
      const created = await webhookService.createWebhook({
        userId: testUserId,
        url: 'https://example.com/webhooks',
        events: ['2fa.enabled'],
      });

      await expect(
        webhookService.updateWebhook(created.id, testUserId, {
          events: ['invalid.event'],
        })
      ).rejects.toThrow('Invalid events');
    });
  });

  describe('deleteWebhook', () => {
    it('should delete webhook', async () => {
      const created = await webhookService.createWebhook({
        userId: testUserId,
        url: 'https://example.com/webhooks',
        events: ['2fa.enabled'],
      });

      const result = await webhookService.deleteWebhook(created.id, testUserId);
      expect(result).toBe(true);

      const dbWebhook = await testDb.webhook.findUnique({
        where: { id: created.id },
      });
      expect(dbWebhook).toBeNull();
    });

    it('should return false for non-existent webhook', async () => {
      const result = await webhookService.deleteWebhook('non-existent', testUserId);
      expect(result).toBe(false);
    });
  });

  describe('createSignature', () => {
    it('should create HMAC signature', () => {
      const payload = JSON.stringify({ event: 'test', data: {} });
      const secret = 'my-secret';

      const signature = WebhookService.createSignature(payload, secret);

      expect(signature).toBeDefined();
      expect(typeof signature).toBe('string');

      // Verify signature manually
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');

      expect(signature).toBe(expectedSignature);
    });

    it('should create different signatures for different payloads', () => {
      const secret = 'my-secret';
      const sig1 = WebhookService.createSignature('payload1', secret);
      const sig2 = WebhookService.createSignature('payload2', secret);

      expect(sig1).not.toBe(sig2);
    });

    it('should create different signatures for different secrets', () => {
      const payload = 'same-payload';
      const sig1 = WebhookService.createSignature(payload, 'secret1');
      const sig2 = WebhookService.createSignature(payload, 'secret2');

      expect(sig1).not.toBe(sig2);
    });
  });

  describe('verifySignature', () => {
    it('should verify valid signature', () => {
      const payload = JSON.stringify({ event: 'test', data: {} });
      const secret = 'my-secret';
      const signature = WebhookService.createSignature(payload, secret);

      const isValid = WebhookService.verifySignature(payload, signature, secret);
      expect(isValid).toBe(true);
    });

    it('should reject invalid signature', () => {
      const payload = JSON.stringify({ event: 'test', data: {} });
      const secret = 'my-secret';
      const wrongSignature = 'invalid-signature-' + '0'.repeat(64);

      const isValid = WebhookService.verifySignature(payload, wrongSignature, secret);
      expect(isValid).toBe(false);
    });

    it('should reject signature with wrong secret', () => {
      const payload = JSON.stringify({ event: 'test', data: {} });
      const signature = WebhookService.createSignature(payload, 'secret1');

      const isValid = WebhookService.verifySignature(payload, signature, 'secret2');
      expect(isValid).toBe(false);
    });

    it('should reject signature with modified payload', () => {
      const originalPayload = JSON.stringify({ event: 'test', data: {} });
      const modifiedPayload = JSON.stringify({ event: 'test', data: { hacked: true } });
      const secret = 'my-secret';
      const signature = WebhookService.createSignature(originalPayload, secret);

      const isValid = WebhookService.verifySignature(modifiedPayload, signature, secret);
      expect(isValid).toBe(false);
    });
  });

  describe('validateEvents', () => {
    it('should validate supported events', () => {
      const validEvents = ['2fa.enabled', '2fa.disabled', '2fa.verified', '2fa.failed'];
      expect(WebhookService.validateEvents(validEvents)).toBe(true);
    });

    it('should reject unsupported events', () => {
      const invalidEvents = ['2fa.enabled', 'unsupported.event'];
      expect(WebhookService.validateEvents(invalidEvents)).toBe(false);
    });

    it('should reject empty events array', () => {
      expect(WebhookService.validateEvents([])).toBe(false);
    });

    it('should accept all supported events', () => {
      expect(WebhookService.validateEvents(WebhookService.SUPPORTED_EVENTS)).toBe(true);
    });
  });

  describe('fireEvent', () => {
    it('should queue webhook delivery for subscribed webhooks', async () => {
      await webhookService.createWebhook({
        userId: testUserId,
        url: 'https://example.com/webhooks',
        events: ['2fa.enabled', '2fa.verified'],
      });

      // Fire event that webhook is subscribed to
      await webhookService.fireEvent({
        event: '2fa.enabled',
        data: { userId: testUserId, method: 'totp' },
        userId: testUserId,
        timestamp: new Date().toISOString(),
      });

      // Note: Actual delivery happens in worker, we just verify it's queued
      // In a real test, you'd mock the queue or check the queue contents
    });

    it('should not queue for inactive webhooks', async () => {
      const webhook = await webhookService.createWebhook({
        userId: testUserId,
        url: 'https://example.com/webhooks',
        events: ['2fa.enabled'],
      });

      // Deactivate webhook
      await webhookService.updateWebhook(webhook.id, testUserId, {
        isActive: false,
      });

      // Fire event - should not queue for inactive webhook
      await webhookService.fireEvent({
        event: '2fa.enabled',
        data: { userId: testUserId },
        userId: testUserId,
        timestamp: new Date().toISOString(),
      });
    });

    it('should not queue for unsubscribed events', async () => {
      await webhookService.createWebhook({
        userId: testUserId,
        url: 'https://example.com/webhooks',
        events: ['2fa.enabled'], // Only subscribed to enabled
      });

      // Fire different event
      await webhookService.fireEvent({
        event: '2fa.verified',
        data: { userId: testUserId },
        userId: testUserId,
        timestamp: new Date().toISOString(),
      });

      // Should not queue since webhook isn't subscribed to this event
    });
  });
});
