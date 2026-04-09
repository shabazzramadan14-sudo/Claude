import axios from 'axios';

const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({ baseURL: BASE_URL });

// Attach JWT on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers['Authorization'] = `Bearer ${token}`;
  return config;
});

// Auto-logout on 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/auth';
    }
    return Promise.reject(err);
  }
);

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
  updateMe: (data) => api.patch('/auth/me', data),
  changePassword: (data) => api.post('/auth/change-password', data)
};

// ─── Providers ────────────────────────────────────────────────────────────────
export const providersAPI = {
  list: (params) => api.get('/providers', { params }),
  get: (id) => api.get(`/providers/${id}`),
  updateMe: (data) => api.patch('/providers/me', data),
  connectArgoLive: (data) => api.post('/providers/me/connect-argolive', data),
  dashboard: () => api.get('/providers/me/dashboard'),
  stripeOnboard: (data) => api.post('/providers/me/stripe-onboard', data)
};

// ─── Streams ──────────────────────────────────────────────────────────────────
export const streamsAPI = {
  list: (params) => api.get('/streams', { params }),
  get: (id) => api.get(`/streams/${id}`),
  create: (data) => api.post('/streams', data),
  update: (id, data) => api.patch(`/streams/${id}`, data),
  end: (id) => api.post(`/streams/${id}/end`),
  viewers: (id) => api.get(`/streams/${id}/viewers`)
};

// ─── Content ──────────────────────────────────────────────────────────────────
export const contentAPI = {
  list: (params) => api.get('/content', { params }),
  get: (id) => api.get(`/content/${id}`),
  create: (data) => api.post('/content', data),
  update: (id, data) => api.patch(`/content/${id}`, data),
  delete: (id) => api.delete(`/content/${id}`),
  createUploadSession: (data) => api.post('/content/upload-session', data)
};

// ─── Purchases ────────────────────────────────────────────────────────────────
export const purchasesAPI = {
  purchase: (data) => api.post('/purchases', data),
  confirm: (id) => api.post(`/purchases/${id}/confirm`),
  myPurchases: () => api.get('/purchases/my'),
  subscribe: (data) => api.post('/purchases/subscribe', data)
};

// ─── Follows ──────────────────────────────────────────────────────────────────
export const followsAPI = {
  follow: (providerId) => api.post(`/follows/${providerId}`),
  unfollow: (providerId) => api.delete(`/follows/${providerId}`),
  myFollows: () => api.get('/follows/me'),
  status: (providerId) => api.get(`/follows/${providerId}/status`),
  updateNotifs: (providerId, data) => api.patch(`/follows/${providerId}/notifications`, data)
};

// ─── Notifications ────────────────────────────────────────────────────────────
export const notificationsAPI = {
  list: (params) => api.get('/notifications', { params }),
  markRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch('/notifications/read-all'),
  delete: (id) => api.delete(`/notifications/${id}`)
};

export default api;
