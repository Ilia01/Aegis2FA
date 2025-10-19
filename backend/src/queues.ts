import { Queue } from 'bullmq';
import { bullmqConnection } from './config/bullmq';

/**
 * Background Job Queues
 *
 * Only audit logs are processed asynchronously.
 * Session storage has been moved to synchronous processing for performance.
 */

export const auditLogQueue = new Queue('auditLogQueue', { connection: bullmqConnection });
