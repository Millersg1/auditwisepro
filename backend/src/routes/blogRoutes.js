import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  listPosts,
  getPost,
  getPostBySlug,
  createPost,
  updatePost,
  deletePost,
  publishPost,
  auditPostSEO,
  generatePostAI,
} from '../controllers/blogController.js';

const router = Router();

// Public route
router.get('/slug/:slug', getPostBySlug);

// Auth required
router.use(authenticate);

router.get('/', listPosts);
router.get('/:id', getPost);
router.post('/', createPost);
router.put('/:id', updatePost);
router.delete('/:id', deletePost);
router.put('/:id/publish', publishPost);
router.post('/:id/seo-audit', auditPostSEO);
router.post('/generate', generatePostAI);

export default router;
