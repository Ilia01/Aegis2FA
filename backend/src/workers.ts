import { Worker } from 'bullmq';
import { bullmqConnection } from './config/bullmq';
import { createAuditLog } from './services/audit.service';
import { webhookService } from './services/webhook.service';

/**
 * Background Workers for Async Operations
 *
 * Workers:
 * - Audit logs: Log security events asynchronously
 * - Webhooks: Deliver webhook events with retry logic
 */

// Audit Log Worker
const auditLogWorker = new Worker('auditLogQueue', async job => {
  const { userId, action, details, ipAddress, userAgent, success } = job.data;
  await createAuditLog({ userId, action, details, ipAddress, userAgent, success });
}, { connection: bullmqConnection });

auditLogWorker.on('completed', (job) => {
  console.log(`[AuditLog] Job ${job.id} completed successfully`);
});

auditLogWorker.on('failed', (job, err) => {
  console.error(`[AuditLog] Job ${job?.id} failed:`, err);
});

// Webhook Delivery Worker
const webhookWorker = new Worker('webhooks', async job => {
  await webhookService.deliverWebhook(job.data);
}, { connection: bullmqConnection });

webhookWorker.on('completed', (job) => {
  console.log(`[Webhook] Job ${job.id} delivered successfully to ${job.data.url}`);
});

webhookWorker.on('failed', (job, err) => {
  console.error(`[Webhook] Job ${job?.id} failed:`, err.message);
});

console.log('[BullMQ Workers] Audit log and webhook workers are running...');
