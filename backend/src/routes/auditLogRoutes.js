import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { listLogs, getLogStats } from '../controllers/auditLogController.js';

const router = Router();

router.use(authenticate);

router.get('/', listLogs);
router.get('/stats', getLogStats);

export default router;
