import axios from 'axios';

// 1. Tampung URL API (dari .env atau fallback)
export const API_URL = import.meta.env.VITE_API_URL || 'https://restoration-alliance-niagara-noted.trycloudflare.com/api';

// 2. Bikin APP_URL dengan membuang kata '/api' di belakangnya untuk keperluan path storage
export const APP_URL = API_URL.replace(/\/api\/?$/, '');

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Interceptor untuk menyisipkan Token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;