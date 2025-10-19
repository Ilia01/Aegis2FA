import { Router } from 'express';
import { getHealth, getLiveness, getReadiness } from '../controllers/health.controller';

const router = Router();

// Comprehensive health check with all dependencies
router.get('/', getHealth);

// Kubernetes/Docker liveness probe
router.get('/live', getLiveness);

// Kubernetes/Docker readiness probe
router.get('/ready', getReadiness);

export default router;
