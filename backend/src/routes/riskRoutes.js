import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  listRisks, getRiskStats, getRiskMatrix,
  getRisk, createRisk, updateRisk, deleteRisk,
} from '../controllers/riskController.js';

const router = Router();

router.get('/', authenticate, listRisks);
router.get('/stats', authenticate, getRiskStats);
router.get('/matrix', authenticate, getRiskMatrix);
router.get('/:id', authenticate, getRisk);
router.post('/', authenticate, createRisk);
router.put('/:id', authenticate, updateRisk);
router.delete('/:id', authenticate, deleteRisk);

export default router;
