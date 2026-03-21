import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  listTemplates, getTemplate,
  createTemplate, updateTemplate, deleteTemplate,
} from '../controllers/templateController.js';

const router = Router();

router.get('/', authenticate, listTemplates);
router.get('/:id', authenticate, getTemplate);
router.post('/', authenticate, createTemplate);
router.put('/:id', authenticate, updateTemplate);
router.delete('/:id', authenticate, deleteTemplate);

export default router;
