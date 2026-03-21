import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  getProfile,
  updateProfile,
  getPreferences,
  updatePreferences,
  getSessions,
  terminateSession,
  getSecurityLog,
} from '../controllers/userProfileController.js';

const router = Router();

router.use(authenticate);

router.get('/', getProfile);
router.put('/', updateProfile);
router.get('/preferences', getPreferences);
router.put('/preferences', updatePreferences);
router.get('/sessions', getSessions);
router.delete('/sessions/:sessionId', terminateSession);
router.get('/security-log', getSecurityLog);

export default router;
