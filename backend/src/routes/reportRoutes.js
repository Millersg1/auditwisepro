import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  listReports,
  getReport,
  generateReport,
  deleteReport,
} from '../controllers/reportController.js';

const router = Router();

router.use(authenticate);

router.get('/', listReports);
router.get('/:id', getReport);
router.post('/generate', generateReport);
router.delete('/:id', deleteReport);

export default router;
