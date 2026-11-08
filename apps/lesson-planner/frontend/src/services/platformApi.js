import axios from 'axios';
import { API_BASE_URL } from '../services/api';

/**
 * Platform API client
 * -------------------
 * Single axios instance for the unified platform. It always sends the bearer
 * token and the currently selected school so the backend can enforce school
 * isolation for every request. Unlike the legacy client it never caches GET
 * responses, because platform data (marks, approvals, attendance) must be
 * accurate immediately after a write.
 */
const platformApi = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 120000
});

export const SCHOOL_STORAGE_KEY = 'platform_school_id';

platformApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  const schoolId = localStorage.getItem(SCHOOL_STORAGE_KEY);
  if (schoolId) config.headers['X-School-Id'] = schoolId;
  return config;
});

platformApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const platformRequest = async (promise) => {
  try {
    const response = await promise;
    return response.data;
  } catch (error) {
    const message = error.response?.data?.message || error.message || 'Request failed';
    const wrapped = new Error(message);
    wrapped.status = error.response?.status;
    wrapped.code = error.response?.data?.code;
    wrapped.payload = error.response?.data;
    throw wrapped;
  }
};

export const platform = {
  // Public (no session required)
  publicHome: () => platformRequest(platformApi.get('/platform/public/home')),
  publicSchools: () => platformRequest(platformApi.get('/platform/public/schools')),
  registerSchoolRequest: (body) => platformRequest(platformApi.post('/platform/public/register-school', body)),
  registerUserRequest: (body) => platformRequest(platformApi.post('/platform/public/register-user', body)),

  // Session
  me: () => platformRequest(platformApi.get('/platform/me')),
  updatePreferences: (body) => platformRequest(platformApi.put('/platform/me/preferences', body)),
  updateProfile: (body) => platformRequest(platformApi.put('/platform/me/profile', body)),

  // Insight
  overview: () => platformRequest(platformApi.get('/platform/overview')),
  analytics: (type = 'summary') => platformRequest(platformApi.get('/platform/analytics', { params: { type } })),
  search: (q) => platformRequest(platformApi.get('/platform/search', { params: { q } })),

  // Notifications
  notifications: (params) => platformRequest(platformApi.get('/platform/notifications', { params })),
  readNotification: (id) => platformRequest(platformApi.post(`/platform/notifications/${id}/read`)),
  readAllNotifications: () => platformRequest(platformApi.post('/platform/notifications/read-all')),

  // Reports
  report: (type) => platformRequest(platformApi.get(`/platform/reports/${type}`)),
  exportReport: (type) =>
    platformApi.get(`/platform/reports/${type}/export`, { params: { format: 'csv' }, responseType: 'blob' })
      .then((response) => response.data),
  exportReportUrl: (type, format = 'csv') =>
    `${API_BASE_URL}/platform/reports/${type}/export?format=${format}`,

  // Resources
  list: (resource, params) => platformRequest(platformApi.get(`/platform/resources/${resource}`, { params })),
  get: (resource, id) => platformRequest(platformApi.get(`/platform/resources/${resource}/${id}`)),
  create: (resource, body) => platformRequest(platformApi.post(`/platform/resources/${resource}`, body)),
  update: (resource, id, body) => platformRequest(platformApi.put(`/platform/resources/${resource}/${id}`, body)),
  remove: (resource, id) => platformRequest(platformApi.delete(`/platform/resources/${resource}/${id}`)),
  bulkAttendance: (body) => platformRequest(platformApi.post('/platform/resources/attendance/bulk', body)),
  approveMark: (id) => platformRequest(platformApi.post(`/platform/marks/${id}/approve`)),
  lockMark: (id) => platformRequest(platformApi.post(`/platform/marks/${id}/lock`)),
  reopenMark: (id) => platformRequest(platformApi.post(`/platform/marks/${id}/reopen`)),
  returnLoan: (id) => platformRequest(platformApi.post(`/platform/loans/${id}/return`)),

  // Administration
  users: (params) => platformRequest(platformApi.get('/platform/users', { params })),
  createUser: (body) => platformRequest(platformApi.post('/platform/users', body)),
  updateUser: (id, body) => platformRequest(platformApi.put(`/platform/users/${id}`, body)),
  setUserRoles: (id, body) => platformRequest(platformApi.put(`/platform/users/${id}/roles`, body)),
  resetUserPassword: (id, body) => platformRequest(platformApi.post(`/platform/users/${id}/reset-password`, body)),

  schools: (params) => platformRequest(platformApi.get('/platform/schools', { params })),
  createSchool: (body) => platformRequest(platformApi.post('/platform/schools', body)),
  updateSchool: (id, body) => platformRequest(platformApi.put(`/platform/schools/${id}`, body)),

  registrations: (params) => platformRequest(platformApi.get('/platform/registrations', { params })),
  reviewRegistration: (id, body) => platformRequest(platformApi.post(`/platform/registrations/${id}/review`, body)),

  settings: () => platformRequest(platformApi.get('/platform/settings')),
  updateSettings: (body) => platformRequest(platformApi.put('/platform/settings', body)),
  audit: (params) => platformRequest(platformApi.get('/platform/audit', { params })),
  modules: () => platformRequest(platformApi.get('/platform/modules')),
  toggleModule: (code, body) => platformRequest(platformApi.put(`/platform/modules/${code}`, body)),

  // Existing AI assistant backend
  askAi: (body) => platformRequest(platformApi.post('/chat/query', body))
};

export default platform;
