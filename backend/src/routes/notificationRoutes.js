import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  listNotifications,
  getUnreadCount,
  getPreferences,
  updatePreferences,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} from '../controllers/notificationController.js';

const router = Router();

router.use(authenticate);

router.get('/', listNotifications);
router.get('/unread-count', getUnreadCount);
router.get('/preferences', getPreferences);
router.put('/preferences', updatePreferences);
router.put('/:id/read', markAsRead);
router.put('/read-all', markAllAsRead);
router.delete('/:id', deleteNotification);

export default router;
