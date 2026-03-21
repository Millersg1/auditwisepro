import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  listDocuments,
  getDocumentStats,
  getDocument,
  createDocument,
  deleteDocument,
} from '../controllers/documentController.js';

const router = Router();

router.use(authenticate);

router.get('/', listDocuments);
router.get('/stats', getDocumentStats);
router.get('/:id', getDocument);
router.post('/', createDocument);
router.delete('/:id', deleteDocument);

export default router;
