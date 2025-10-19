import { Router } from 'express';
import {
  createApiKey,
  listApiKeys,
  getApiKey,
  updateApiKey,
  rotateApiKey,
  revokeApiKey,
  deleteApiKey,
} from '../controllers/apiKey.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// All API key management routes require user authentication (JWT)
// API keys themselves cannot manage API keys (prevents self-modification)

// Create a new API key
router.post('/', authenticate, createApiKey);

// List all API keys
router.get('/', authenticate, listApiKeys);

// Get a specific API key
router.get('/:id', authenticate, getApiKey);

// Update an API key
router.patch('/:id', authenticate, updateApiKey);

// Rotate an API key (generate new key)
router.post('/:id/rotate', authenticate, rotateApiKey);

// Revoke (deactivate) an API key
router.post('/:id/revoke', authenticate, revokeApiKey);

// Delete an API key permanently
router.delete('/:id', authenticate, deleteApiKey);

export default router;
