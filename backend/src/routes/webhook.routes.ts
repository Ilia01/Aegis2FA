import { Router } from 'express';
import {
  createWebhook,
  listWebhooks,
  getWebhook,
  updateWebhook,
  deleteWebhook,
  testWebhook,
  getSupportedEvents,
} from '../controllers/webhook.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Get supported webhook events (public endpoint for documentation)
router.get('/events', getSupportedEvents);

// All webhook management routes require authentication
router.use(authenticate);

// Create a new webhook
router.post('/', createWebhook);

// List all webhooks
router.get('/', listWebhooks);

// Get a specific webhook
router.get('/:id', getWebhook);

// Update a webhook
router.patch('/:id', updateWebhook);

// Test a webhook
router.post('/:id/test', testWebhook);

// Delete a webhook
router.delete('/:id', deleteWebhook);

export default router;
