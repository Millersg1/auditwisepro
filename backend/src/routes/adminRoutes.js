import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { getStats, getUsers, updateUser, deleteUser } from '../controllers/adminController.js';

const router = Router();

router.use(authenticate, requireAdmin);

router.get('/stats', getStats);
router.get('/users', getUsers);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);

export default router;
