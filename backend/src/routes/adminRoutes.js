import { Router } from 'express';
import { authenticate, requireAdminOrAbove } from '../middleware/auth.js';
import { getStats, getUsers, updateUser, deleteUser, getOrgUsers, updateOrgUser } from '../controllers/adminController.js';

const router = Router();

router.use(authenticate, requireAdminOrAbove);

router.get('/stats', getStats);
router.get('/users', getUsers);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);
router.get('/org-users', getOrgUsers);
router.put('/org-users/:id', updateOrgUser);

export default router;
