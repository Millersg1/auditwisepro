import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  getOrganization,
  createOrganization,
  updateOrganization,
  listMembers,
  addMember,
  updateMemberRole,
  removeMember,
  getSettings,
  updateSettings,
} from '../controllers/organizationController.js';

const router = Router();

router.use(authenticate);

router.get('/', getOrganization);
router.post('/', createOrganization);
router.put('/', updateOrganization);
router.get('/members', listMembers);
router.post('/members', addMember);
router.put('/members/:memberId/role', updateMemberRole);
router.delete('/members/:memberId', removeMember);
router.get('/settings', getSettings);
router.put('/settings', updateSettings);

export default router;
