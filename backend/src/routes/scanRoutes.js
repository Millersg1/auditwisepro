import { Router } from 'express';
import { authenticate, optionalAuth } from '../middleware/auth.js';
import { scanLimiter } from '../middleware/rateLimiter.js';
import {
  createScan, getScan, getUserScans, getPublicScan, deleteScan,
} from '../controllers/scanController.js';

const router = Router();

router.post('/', optionalAuth, scanLimiter, createScan);
router.get('/', authenticate, getUserScans);
router.get('/:id', authenticate, getScan);
router.get('/:id/public', getPublicScan);
router.delete('/:id', authenticate, deleteScan);

export default router;
