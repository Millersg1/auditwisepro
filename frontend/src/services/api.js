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

export default api;
