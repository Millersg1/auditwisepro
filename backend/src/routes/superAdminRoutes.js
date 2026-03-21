import { Router } from 'express';
import { authenticate, requireSuperAdmin } from '../middleware/auth.js';
import {
  getSystemStats,
  getAllUsers,
  getUserDetail,
  updateUser,
  deleteUser,
  impersonateUser,
  getAllOrganizations,
  getOrganizationDetail,
  updateOrganization,
  deleteOrganization,
  getSystemSettings,
  updateSystemSetting,
  getRevenueStats,
  getAuditLog,
  sendBulkEmail,
  toggleMaintenance,
  getHealthCheck,
} from '../controllers/superAdminController.js';

const router = Router();

router.use(authenticate, requireSuperAdmin);

// Dashboard & stats
router.get('/stats', getSystemStats);
router.get('/health', getHealthCheck);
router.get('/revenue', getRevenueStats);
router.get('/activity', getAuditLog);

// User management
router.get('/users', getAllUsers);
router.get('/users/:id', getUserDetail);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);
router.post('/users/:id/impersonate', impersonateUser);

// Organization management
router.get('/organizations', getAllOrganizations);
router.get('/organizations/:id', getOrganizationDetail);
router.put('/organizations/:id', updateOrganization);
router.delete('/organizations/:id', deleteOrganization);

// System settings
router.get('/settings', getSystemSettings);
router.put('/settings', updateSystemSetting);

// Actions
router.post('/bulk-email', sendBulkEmail);
router.post('/maintenance', toggleMaintenance);

export default router;
