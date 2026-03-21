import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  listFrameworks, getComplianceStats, getComplianceDashboard,
  listRecords, getRecord, createRecord, updateRecord, deleteRecord,
} from '../controllers/complianceController.js';

const router = Router();

router.get('/frameworks', authenticate, listFrameworks);
router.get('/stats', authenticate, getComplianceStats);
router.get('/dashboard', authenticate, getComplianceDashboard);
router.get('/', authenticate, listRecords);
router.get('/:id', authenticate, getRecord);
router.post('/', authenticate, createRecord);
router.put('/:id', authenticate, updateRecord);
router.delete('/:id', authenticate, deleteRecord);

export default router;
