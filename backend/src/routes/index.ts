import { Router } from 'express';
import authRoutes from './auth.routes';
import twofaRoutes from './twofa.routes';
import emailVerificationRoutes from './emailVerification.routes';
import healthRoutes from './health.routes';
import apiKeyRoutes from './apiKey.routes';
import webhookRoutes from './webhook.routes';

const router = Router();

// Health check endpoints (no auth required)
router.use('/health', healthRoutes);

// Application routes
router.use('/auth', authRoutes);
router.use('/2fa', twofaRoutes);
router.use('/email', emailVerificationRoutes);
router.use('/api-keys', apiKeyRoutes);
router.use('/webhooks', webhookRoutes);

export default router;