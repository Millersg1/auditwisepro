import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  listAudits, getAuditStats, getAudit,
  createAudit, updateAudit, deleteAudit,
  listFindings, createFinding, updateFinding, deleteFinding,
} from '../controllers/auditController.js';

const router = Router();

router.get('/', authenticate, listAudits);
router.get('/stats', authenticate, getAuditStats);
router.get('/:id', authenticate, getAudit);
router.post('/', authenticate, createAudit);
router.put('/:id', authenticate, updateAudit);
router.delete('/:id', authenticate, deleteAudit);

// Findings sub-routes
router.get('/:id/findings', authenticate, listFindings);
router.post('/:id/findings', authenticate, createFinding);
router.put('/:id/findings/:findingId', authenticate, updateFinding);
router.delete('/:id/findings/:findingId', authenticate, deleteFinding);

export default router;
