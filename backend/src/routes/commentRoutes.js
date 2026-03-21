import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  listComments,
  createComment,
  updateComment,
  deleteComment,
} from '../controllers/commentController.js';

const router = Router();

router.use(authenticate);

router.get('/', listComments);
router.post('/', createComment);
router.put('/:id', updateComment);
router.delete('/:id', deleteComment);

export default router;
