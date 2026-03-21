import axios from 'axios';

const API_BASE = import.meta.env.PROD
  ? 'https://auditwisepro.com/api'
  : '/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('awp_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('awp_token');
      localStorage.removeItem('awp_user');
      if (window.location.pathname !== '/login' && window.location.pathname !== '/') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ===== Auth =====
export const loginUser = (data) => api.post('/auth/login', data);
export const registerUser = (data) => api.post('/auth/register', data);
export const forgotPassword = (data) => api.post('/auth/forgot-password', data);
export const resetPassword = (token, data) => api.post(`/auth/reset-password/${token}`, data);
export const verifyEmail = (token) => api.get(`/auth/verify-email/${token}`);

// ===== Profile =====
export const getProfile = () => api.get('/auth/profile');
export const updateProfile = (data) => api.put('/auth/profile', data);
export const changePassword = (data) => api.put('/auth/change-password', data);

// ===== Scans =====
export const createScan = (data) => api.post('/scans', data);
export const getScans = (params) => api.get('/scans', { params });
export const getScan = (id) => api.get(`/scans/${id}`);
export const getPublicScan = (id) => api.get(`/scans/public/${id}`);
export const deleteScan = (id) => api.delete(`/scans/${id}`);
export const downloadPDF = (id) => api.get(`/scans/${id}/pdf`, { responseType: 'blob' });

// ===== Stripe =====
export const createCheckoutSession = (plan) => api.post('/stripe/create-checkout-session', { plan });
export const createBillingPortal = () => api.post('/stripe/create-billing-portal');

// ===== Contact =====
export const submitContact = (data) => api.post('/contact', data);

// ===== Admin =====
export const getAdminStats = () => api.get('/admin/stats');
export const getAdminUsers = (params) => api.get('/admin/users', { params });
export const updateUserPlan = (userId, data) => api.put(`/admin/users/${userId}/plan`, data);
export const deleteUser = (userId) => api.delete(`/admin/users/${userId}`);

// ===== Clients =====
export const getClients = (params) => api.get('/clients', { params });
export const getClient = (id) => api.get(`/clients/${id}`);
export const createClient = (data) => api.post('/clients', data);
export const updateClient = (id, data) => api.put(`/clients/${id}`, data);
export const deleteClient = (id) => api.delete(`/clients/${id}`);
export const getClientAudits = (id, params) => api.get(`/clients/${id}/audits`, { params });
export const getClientRisks = (id, params) => api.get(`/clients/${id}/risks`, { params });
export const getClientCompliance = (id, params) => api.get(`/clients/${id}/compliance`, { params });
export const getClientDocuments = (id, params) => api.get(`/clients/${id}/documents`, { params });
export const getClientActivity = (id, params) => api.get(`/clients/${id}/activity`, { params });

// ===== Audits =====
export const getAudits = (params) => api.get('/audits', { params });
export const getAudit = (id) => api.get(`/audits/${id}`);
export const createAudit = (data) => api.post('/audits', data);
export const updateAudit = (id, data) => api.put(`/audits/${id}`, data);
export const deleteAudit = (id) => api.delete(`/audits/${id}`);
export const updateAuditStatus = (id, status) => api.patch(`/audits/${id}/status`, { status });
export const exportAuditReport = (id) => api.get(`/audits/${id}/export`, { responseType: 'blob' });

// ===== Findings =====
export const getFindings = (auditId, params) => api.get(`/audits/${auditId}/findings`, { params });
export const createFinding = (auditId, data) => api.post(`/audits/${auditId}/findings`, data);
export const updateFinding = (auditId, id, data) => api.put(`/audits/${auditId}/findings/${id}`, data);
export const deleteFinding = (auditId, id) => api.delete(`/audits/${auditId}/findings/${id}`);

// ===== Checklist =====
export const getChecklist = (auditId) => api.get(`/audits/${auditId}/checklist`);
export const updateChecklistItem = (auditId, itemId, data) => api.patch(`/audits/${auditId}/checklist/${itemId}`, data);

// ===== Comments =====
export const getComments = (auditId) => api.get(`/audits/${auditId}/comments`);
export const createComment = (auditId, data) => api.post(`/audits/${auditId}/comments`, data);
export const deleteComment = (auditId, id) => api.delete(`/audits/${auditId}/comments/${id}`);

// ===== Activity =====
export const getAuditActivity = (auditId) => api.get(`/audits/${auditId}/activity`);

// ===== Documents =====
export const getDocuments = (params) => api.get('/documents', { params });
export const uploadDocument = (data) => api.post('/documents', data, { headers: { 'Content-Type': 'multipart/form-data' } });
export const deleteDocument = (id) => api.delete(`/documents/${id}`);

// ===== Templates =====
export const getTemplates = (params) => api.get('/templates', { params });
export const getTemplate = (id) => api.get(`/templates/${id}`);
export const createTemplate = (data) => api.post('/templates', data);
export const updateTemplate = (id, data) => api.put(`/templates/${id}`, data);
export const deleteTemplate = (id) => api.delete(`/templates/${id}`);

// ===== Risk Assessment =====
export const getRisks = (params) => api.get('/risks', { params });
export const getRisk = (id) => api.get(`/risks/${id}`);
export const createRisk = (data) => api.post('/risks', data);
export const updateRisk = (id, data) => api.put(`/risks/${id}`, data);
export const deleteRisk = (id) => api.delete(`/risks/${id}`);
export const getRiskStats = () => api.get('/risks/stats');

// ===== Compliance =====
export const getComplianceRecords = (params) => api.get('/compliance', { params });
export const getComplianceRecord = (id) => api.get(`/compliance/${id}`);
export const createComplianceRecord = (data) => api.post('/compliance', data);
export const updateComplianceRecord = (id, data) => api.put(`/compliance/${id}`, data);
export const deleteComplianceRecord = (id) => api.delete(`/compliance/${id}`);
export const getComplianceStats = (params) => api.get('/compliance/stats', { params });

// ===== Users (for dropdowns) =====
export const getUsers = () => api.get('/admin/users');

// ===== Compliance Frameworks =====
export const getComplianceFrameworks = () => api.get('/compliance/frameworks');
export const getComplianceDashboard = () => api.get('/compliance/dashboard');

// ===== Risk Matrix =====
export const getRiskMatrix = () => api.get('/risks/matrix');

// ===== Reports =====
export const getReports = (params) => api.get('/reports', { params });
export const getReport = (id) => api.get(`/reports/${id}`);
export const generateReport = (data) => api.post('/reports/generate', data);
export const deleteReport = (id) => api.delete(`/reports/${id}`);

// ===== Blog =====
export const getBlogPosts = (params) => api.get('/blog', { params });
export const getBlogPost = (id) => api.get(`/blog/${id}`);
export const getBlogPostBySlug = (slug) => api.get(`/blog/slug/${slug}`);
export const createBlogPost = (data) => api.post('/blog', data);
export const updateBlogPost = (id, data) => api.put(`/blog/${id}`, data);
export const deleteBlogPost = (id) => api.delete(`/blog/${id}`);
export const publishBlogPost = (id) => api.put(`/blog/${id}/publish`);
export const auditBlogPostSEO = (id) => api.post(`/blog/${id}/seo-audit`);
export const generateBlogPostAI = (data) => api.post('/blog/generate', data);

// ===== Notifications =====
export const getNotifications = (params) => api.get('/notifications', { params });
export const getUnreadNotificationCount = () => api.get('/notifications/unread-count');
export const markNotificationRead = (id) => api.put(`/notifications/${id}/read`);
export const markAllNotificationsRead = () => api.put('/notifications/read-all');
export const deleteNotification = (id) => api.delete(`/notifications/${id}`);
export const getNotificationPreferences = () => api.get('/notifications/preferences');
export const updateNotificationPreferences = (data) => api.put('/notifications/preferences', data);

// ===== Organization =====
export const getOrganization = () => api.get('/organization');
export const createOrganization = (data) => api.post('/organization', data);
export const updateOrganization = (data) => api.put('/organization', data);
export const getOrgMembers = () => api.get('/organization/members');
export const addOrgMember = (data) => api.post('/organization/members', data);
export const updateMemberRole = (memberId, data) => api.put(`/organization/members/${memberId}/role`, data);
export const removeOrgMember = (memberId) => api.delete(`/organization/members/${memberId}`);
export const getOrgSettings = () => api.get('/organization/settings');
export const updateOrgSettings = (data) => api.put('/organization/settings', data);

// ===== Comments (generic) =====
export const getEntityComments = (params) => api.get('/comments', { params });
export const createEntityComment = (data) => api.post('/comments', data);
export const updateEntityComment = (id, data) => api.put(`/comments/${id}`, data);
export const deleteEntityComment = (id) => api.delete(`/comments/${id}`);

// ===== Activity Log =====
export const getActivityLog = (params) => api.get('/activity', { params });
export const getActivityStats = () => api.get('/activity/stats');

// ===== User Profile =====
export const getUserProfile = () => api.get('/profile');
export const updateUserProfile = (data) => api.put('/profile', data);
export const getUserPreferences = () => api.get('/profile/preferences');
export const updateUserPreferences = (data) => api.put('/profile/preferences', data);
export const getUserSessions = () => api.get('/profile/sessions');
export const terminateSession = (id) => api.delete(`/profile/sessions/${id}`);
export const getSecurityLog = () => api.get('/profile/security-log');

// ===== Client Stats =====
export const getClientStats = () => api.get('/clients/stats');

// ===== Audit Stats =====
export const getAuditStats = () => api.get('/audits/stats');

// ===== Document Stats =====
export const getDocumentStats = () => api.get('/documents/stats');

export default api;
