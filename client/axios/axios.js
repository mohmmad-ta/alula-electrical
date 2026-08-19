import axios from 'axios';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api/v1';
const backendUrl = (import.meta.env.VITE_BACKEND_URL || '').replace(/\/$/, '');

const api = axios.create({
  baseURL: apiBaseUrl,
  timeout: 12000,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export const resolveAssetUrl = (assetPath) => {
  if (!assetPath) return '';
  if (/^https?:\/\//i.test(assetPath)) return assetPath;

  const normalizedPath = assetPath.startsWith('/')
    ? assetPath
    : `/public/images/${assetPath}`;

  return `${backendUrl}${normalizedPath}`;
};

export default api;
