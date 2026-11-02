import axios from 'axios';
import { toast } from 'sonner';

const rawApiUrl = (import.meta.env.VITE_API_URL || '/api').trim().replace(/\/+$/, '');
const API_BASE_URL = rawApiUrl.endsWith('/api') ? rawApiUrl : `${rawApiUrl}/api`;

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: attach JWT access token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('jb_access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle 401 and 403 account_disabled
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response ? error.response.status : null;
    const errorData = error.response ? error.response.data : null;

    // 1. Account disabled handler (403 with code account_disabled or message)
    if (
      status === 403 &&
      (errorData?.code === 'account_disabled' ||
        (typeof errorData?.detail === 'string' && errorData.detail.includes('disabled by the administrator')))
    ) {
      const message =
        errorData?.detail ||
        'Your access has been disabled by the administrator. Please contact admin.';

      // Clear session immediately
      localStorage.removeItem('jb_access_token');
      localStorage.removeItem('jb_refresh_token');
      localStorage.removeItem('jb_user');

      // Notify user with sonner toast
      toast.error(message, {
        duration: 8000,
        id: 'account_disabled_toast',
      });

      // Redirect to login if not already there
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = `/login?disabled=1&message=${encodeURIComponent(message)}`;
      }

      return Promise.reject(error);
    }

    // 2. Token expired handler (401)
    if (status === 401 && !originalRequest._retry && !originalRequest.url?.includes('/auth/login/')) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('jb_refresh_token');

      if (refreshToken) {
        try {
          const res = await axios.post(`${API_BASE_URL}/auth/refresh/`, {
            refresh: refreshToken,
          });

          const newAccessToken = res.data.access;
          localStorage.setItem('jb_access_token', newAccessToken);
          if (res.data.refresh) {
            localStorage.setItem('jb_refresh_token', res.data.refresh);
          }

          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return apiClient(originalRequest);
        } catch (refreshErr: any) {
          // If refresh failed because account is disabled
          const refreshErrData = refreshErr.response?.data;
          if (
            refreshErr.response?.status === 403 ||
            refreshErrData?.code === 'account_disabled' ||
            (typeof refreshErrData?.detail === 'string' && refreshErrData.detail.includes('disabled by the administrator'))
          ) {
            const message =
              refreshErrData?.detail ||
              'Your access has been disabled by the administrator. Please contact admin.';
            localStorage.removeItem('jb_access_token');
            localStorage.removeItem('jb_refresh_token');
            localStorage.removeItem('jb_user');
            toast.error(message, { duration: 8000, id: 'account_disabled_toast' });
            window.location.href = `/login?disabled=1&message=${encodeURIComponent(message)}`;
            return Promise.reject(refreshErr);
          }

          // Normal session expiration
          localStorage.removeItem('jb_access_token');
          localStorage.removeItem('jb_refresh_token');
          localStorage.removeItem('jb_user');
          if (!window.location.pathname.startsWith('/login')) {
            window.location.href = '/login?expired=1';
          }
          return Promise.reject(refreshErr);
        }
      } else {
        localStorage.removeItem('jb_access_token');
        localStorage.removeItem('jb_refresh_token');
        localStorage.removeItem('jb_user');
        if (!window.location.pathname.startsWith('/login')) {
          window.location.href = '/login';
        }
      }
    }

    return Promise.reject(error);
  }
);

